#!/usr/bin/env python3
"""Strict, single-transaction PostgreSQL -> MySQL copy for an EMPTY Prisma baseline.

Read-only source snapshot; no FK disabling, truncation, coercion, skips or upserts.
Run only during a write freeze after taking a verified pg_dump backup.
"""
import argparse
import datetime as dt
import decimal
import json
import os
import subprocess
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

import psycopg
import pymysql
from psycopg.rows import dict_row
from pymysql.cursors import DictCursor

JSON_COLUMNS = {
    "Printer": {"supportedSizes"},
    "Coupon": {"applicablePlanCodes"},
    "VendorPaymentAccount": {"requirements"},
    "Payment": {"rawPayload"},
    "PrintJobEvent": {"metadata"},
    "WebhookEvent": {"payload"},
    "AuditLog": {"details"},
}
MONEY_COLUMNS = {
    "VendorPricing": ("pricePerSideMinor", "sheetChargeMinor", "minimumOrderMinor"),
    "Order": ("subtotalMinor", "taxMinor", "totalAmountMinor"),
    "OrderItem": ("unitPriceMinor", "itemTotalMinor"),
    "Payment": ("amountMinor",),
    "Refund": ("amountMinor",),
    "SubscriptionPlan": ("priceMonthlyMinor", "priceYearlyMinor"),
    "CouponRedemption": ("discountMinor",),
    "VendorSubscriptionInvoice": ("originalPriceMinor", "discountMinor", "finalAmountMinor"),
}
LOGICAL_LINKS = (
    ("PrintJob", "vendorId", "Vendor"),
    ("DocumentUploadSession", "vendorId", "Vendor"),
    ("VendorFcmToken", "vendorId", "Vendor"),
    ("VendorFcmToken", "userId", "User"),
    ("CouponRedemption", "invoiceId", "VendorSubscriptionInvoice"),
)


def mysql_config(url):
    parsed = urlsplit(url)
    if parsed.scheme != "mysql" or not parsed.hostname or not parsed.path.strip("/"):
        raise ValueError("MYSQL_TARGET_URL must be mysql://USER:PASSWORD@HOST:PORT/DB")
    params = parse_qs(parsed.query)
    options = dict(host=parsed.hostname, port=parsed.port or 3306,
                   user=unquote(parsed.username or ""), password=unquote(parsed.password or ""),
                   database=unquote(parsed.path.lstrip("/")), charset="utf8mb4",
                   cursorclass=DictCursor, autocommit=False)
    if params.get("ssl", ["false"])[0].lower() == "true":
        options.update(ssl_verify_cert=True, ssl_verify_identity=True)
    return options


def pg_tables(cursor):
    cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name")
    return {r["table_name"] for r in cursor.fetchall()}


def mysql_tables(cursor, db_name):
    cursor.execute("SELECT table_name AS name FROM information_schema.tables WHERE table_schema=%s AND table_type='BASE TABLE'", (db_name,))
    return {r["name"] for r in cursor.fetchall()}


def mysql_columns(cursor, db_name, table):
    cursor.execute("""SELECT column_name AS name, data_type AS kind,
                             character_maximum_length AS max_length, is_nullable AS nullable
                      FROM information_schema.columns WHERE table_schema=%s AND table_name=%s
                      ORDER BY ordinal_position""", (db_name, table))
    return {r["name"]: r for r in cursor.fetchall()}


def pg_columns(cursor, table):
    cursor.execute("""SELECT column_name, data_type FROM information_schema.columns
                      WHERE table_schema='public' AND table_name=%s ORDER BY ordinal_position""", (table,))
    return {r["column_name"]: r["data_type"] for r in cursor.fetchall()}


def mysql_dependencies(cursor, db_name, tables):
    cursor.execute("""SELECT table_name AS child, referenced_table_name AS parent
                      FROM information_schema.key_column_usage
                      WHERE table_schema=%s AND referenced_table_name IS NOT NULL""", (db_name,))
    pending = {table: set() for table in tables}
    for edge in cursor.fetchall():
        pending[edge["child"]].add(edge["parent"])
    ordered = []
    while pending:
        ready = sorted(t for t, parents in pending.items() if parents.issubset(ordered))
        if not ready:
            raise ValueError("Cyclic/unknown foreign keys; manual migration review required")
        for table in ready:
            ordered.append(table)
            del pending[table]
    return ordered


def comparable(value, is_json):
    if is_json and value is not None:
        if isinstance(value, (str, bytes)):
            value = json.loads(value)
        return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    if isinstance(value, dt.datetime):
        if value.tzinfo:
            value = value.astimezone(dt.timezone.utc).replace(tzinfo=None)
        return value.isoformat(timespec="microseconds")
    if isinstance(value, decimal.Decimal):
        return value
    if isinstance(value, memoryview):
        return value.tobytes()
    return value


def verify_rows(table, columns, original, copied):
    original_by_id = {str(row["id"]): row for row in original}
    copied_by_id = {str(row["id"]): row for row in copied}
    if original_by_id.keys() != copied_by_id.keys() or len(original_by_id) != len(original):
        raise ValueError(f"{table}: missing or duplicate primary keys")
    for key, row in original_by_id.items():
        for col in columns:
            if comparable(row[col], col in JSON_COLUMNS.get(table, ())) != comparable(
                    copied_by_id[key][col], col in JSON_COLUMNS.get(table, ())):
                raise ValueError(f"{table}: field {col} differs for id {key}; copy rolled back")


def copy_table(source, target, table, dest_columns, batch_size):
    cols = list(dest_columns)
    quoted = ", ".join('`' + col + '`' for col in cols)
    markers = ", ".join(["%s"] * len(cols))
    # psycopg does not automatically decode unregistered PostgreSQL enum arrays.
    # Cast those two known arrays to text[] to obtain a genuine Python list.
    projection = ", ".join(
        f'ARRAY(SELECT unnest("{col}")::text) AS "{col}"'
        if (table, col) in {("Printer", "supportedSizes"), ("Coupon", "applicablePlanCodes")}
        else f'"{col}"' for col in cols
    )
    count = 0
    totals = {col: 0 for col in MONEY_COLUMNS.get(table, ())}
    with source.cursor(name="copy_" + table, row_factory=dict_row) as stream:
        stream.itersize = batch_size
        stream.execute(f'SELECT {projection} FROM "{table}" ORDER BY id')
        with target.cursor() as dest:
            while rows := stream.fetchmany(batch_size):
                for row in rows:
                    for col in cols:
                        value = row[col]
                        max_len = dest_columns[col]["max_length"]
                        if max_len is not None and value is not None and len(value) > max_len:
                            raise ValueError(f"{table}.{col}: source value exceeds MySQL column width")
                        if col in JSON_COLUMNS.get(table, ()) and value is not None:
                            row[col] = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
                    for col in totals:
                        totals[col] += row[col]
                dest.executemany(f"INSERT INTO `{table}` ({quoted}) VALUES ({markers})",
                                 [tuple(row[col] for col in cols) for row in rows])
                ids = [row["id"] for row in rows]
                dest.execute(f"SELECT {quoted} FROM `{table}` WHERE id IN ({','.join(['%s'] * len(ids))})", ids)
                verify_rows(table, cols, rows, dest.fetchall())
                count += len(rows)
            dest.execute(f"SELECT COUNT(*) AS n FROM `{table}`")
            if dest.fetchone()["n"] != count:
                raise ValueError(f"{table}: target count differs")
            if totals:
                aggregates = ", ".join(f"COALESCE(SUM(`{col}`), 0) AS `{col}`" for col in totals)
                dest.execute(f"SELECT {aggregates} FROM `{table}`")
                target_totals = {col: int(value) for col, value in dest.fetchone().items()}
                if target_totals != totals:
                    raise ValueError(f"{table}: financial totals differ; copy rolled back")
            else:
                target_totals = {}
    return {"source": count, "target_verified": count,
            "source_minor_unit_totals": totals, "target_minor_unit_totals": target_totals}


def verify_foreign_keys(cursor, db_name):
    cursor.execute("""SELECT table_name AS child, column_name AS child_col,
                             referenced_table_name AS parent, referenced_column_name AS parent_col
                      FROM information_schema.key_column_usage
                      WHERE table_schema=%s AND referenced_table_name IS NOT NULL""", (db_name,))
    keys = cursor.fetchall()
    for fk in keys:
        # Identifiers originate only from information_schema (not untrusted request data).
        child, col, parent, parent_col = (fk[k] for k in ("child", "child_col", "parent", "parent_col"))
        cursor.execute(f"""SELECT COUNT(*) AS n FROM `{child}` c LEFT JOIN `{parent}` p
                          ON c.`{col}` = p.`{parent_col}`
                          WHERE c.`{col}` IS NOT NULL AND p.`{parent_col}` IS NULL""")
        if cursor.fetchone()["n"]:
            raise ValueError(f"{child}.{col}: dangling foreign keys; copy rolled back")
    for child, col, parent in LOGICAL_LINKS:
        cursor.execute(f"""SELECT COUNT(*) AS n FROM `{child}` c LEFT JOIN `{parent}` p
                          ON c.`{col}` = p.id WHERE c.`{col}` IS NOT NULL AND p.id IS NULL""")
        if cursor.fetchone()["n"]:
            raise ValueError(f"{child}.{col}: orphaned logical references require manual review")
    return len(keys), len(LOGICAL_LINKS)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true", help="Explicitly authorize target-only writes")
    parser.add_argument("--backup", type=Path, required=True, help="Existing pg_dump custom-format backup")
    parser.add_argument("--report", type=Path, required=True, help="Write counts and verification status here")
    parser.add_argument("--batch-size", type=int, default=250)
    args = parser.parse_args()
    if not args.execute or not 1 <= args.batch_size <= 1000:
        parser.error("--execute and --batch-size between 1 and 1000 are required")
    if not args.backup.is_file() or args.backup.stat().st_size == 0:
        parser.error("Nonempty PostgreSQL backup is required; do not start migration without one")
    subprocess.run(["pg_restore", "--list", str(args.backup)], stdout=subprocess.DEVNULL, check=True)
    pg_url = os.environ.get("POSTGRES_SOURCE_URL", "")
    my_url = os.environ.get("MYSQL_TARGET_URL", "")
    if not pg_url.startswith(("postgresql://", "postgres://")) or not my_url.startswith("mysql://"):
        parser.error("Set POSTGRES_SOURCE_URL and MYSQL_TARGET_URL (different servers/databases)")
    if pg_url == my_url:
        parser.error("Source and target must differ")
    db_name = mysql_config(my_url)["database"]
    if mysql_config(my_url)["user"].lower() == "root":
        parser.error("Use a dedicated MySQL migration user, never the root account")
    report = {"status": "NOT_VERIFIED", "tables": {}, "relationships_verified": 0,
              "logical_references_verified": 0,
              "skipped_records": 0, "failed_records": 0}
    with psycopg.connect(pg_url, autocommit=True) as source, pymysql.connect(**mysql_config(my_url)) as target:
        source.execute("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY")
        source.execute("SET LOCAL TIME ZONE 'UTC'")
        with source.cursor(row_factory=dict_row) as pg, target.cursor() as my:
            pg.execute("SHOW server_version")
            report["postgresql_version"] = pg.fetchone()["server_version"]
            my.execute("SELECT VERSION() AS version")
            report["mysql_version"] = my.fetchone()["version"]
            if "mariadb" in report["mysql_version"].lower():
                raise ValueError("Target must be MySQL; MariaDB is not the verified target")
            my.execute("SET SESSION time_zone = '+00:00'")
            my.execute("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO'")
            original_tables = pg_tables(pg) - {"_prisma_migrations"}
            pg.execute("""SELECT table_schema, table_name FROM information_schema.tables
                          WHERE table_type='BASE TABLE' AND table_schema NOT IN ('public', 'pg_catalog', 'information_schema')
                          AND table_schema NOT LIKE 'pg_temp%' AND table_schema NOT LIKE 'pg_toast%'""")
            if pg.fetchall():
                raise ValueError("Source has tables outside public; manual full-schema review required")
            new_tables = mysql_tables(my, db_name) - {"_prisma_migrations"}
            if original_tables != new_tables:
                raise ValueError(f"Schema table sets differ; only in source: {sorted(original_tables-new_tables)}, "
                                 f"only in target: {sorted(new_tables-original_tables)}")
            if not new_tables:
                raise ValueError("Target schema is empty; apply the MySQL baseline migration first")
            my.execute("""SELECT table_name AS name, engine AS storage_engine,
                                 table_collation AS collation FROM information_schema.tables
                          WHERE table_schema=%s AND table_type='BASE TABLE'""", (db_name,))
            for table_info in my.fetchall():
                if table_info["name"] in new_tables and (
                        table_info["storage_engine"] != "InnoDB" or table_info["collation"] != "utf8mb4_bin"):
                    raise ValueError(f"{table_info['name']}: requires InnoDB and utf8mb4_bin")
            pg.execute("""SELECT (SELECT COUNT(*) FROM pg_matviews WHERE schemaname='public') AS matviews,
                                 (SELECT COUNT(*) FROM pg_views WHERE schemaname='public') AS views,
                                 (SELECT COUNT(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
                                   JOIN pg_namespace n ON n.oid=c.relnamespace
                                   WHERE n.nspname='public' AND NOT t.tgisinternal) AS triggers,
                                 (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                                   WHERE n.nspname='public') AS functions""")
            report["source_database_objects"] = pg.fetchone()
            if any(report["source_database_objects"].values()):
                raise ValueError("PostgreSQL views, triggers or functions require an explicit reviewed MySQL port")
            pg.execute("SELECT extname FROM pg_extension WHERE extname <> 'plpgsql'")
            report["source_extensions"] = [r["extname"] for r in pg.fetchall()]
            if report["source_extensions"]:
                raise ValueError("PostgreSQL extensions require an explicit compatibility review")

            ordered = mysql_dependencies(my, db_name, new_tables)
            columns = {}
            for table in ordered:
                pg_cols = pg_columns(pg, table)
                my_cols = mysql_columns(my, db_name, table)
                if set(pg_cols) != set(my_cols) or "id" not in pg_cols:
                    raise ValueError(f"{table}: source/target columns or primary key differ")
                for col, source_type in pg_cols.items():
                    if source_type == "ARRAY" and (table, col) not in {
                            ("Printer", "supportedSizes"), ("Coupon", "applicablePlanCodes")}:
                        raise ValueError(f"Unsupported PostgreSQL array: {table}.{col}")
                    if source_type == "ARRAY" and my_cols[col]["kind"] != "json":
                        raise ValueError(f"{table}.{col}: array destination must be JSON")
                my.execute(f"SELECT COUNT(*) AS n FROM `{table}`")
                if my.fetchone()["n"]:
                    raise ValueError(f"{table}: target is not empty; never overwrite existing data")
                columns[table] = my_cols

            try:
                for table in ordered:
                    report["tables"][table] = copy_table(source, target, table, columns[table], args.batch_size)
                (report["relationships_verified"],
                 report["logical_references_verified"]) = verify_foreign_keys(my, db_name)
                target.commit()
            except BaseException:
                target.rollback()
                raise
    report["status"] = "DATA_VERIFIED_STAGING_ONLY"
    report["tables_migrated"] = len(report["tables"])
    report["source_records"] = sum(t["source"] for t in report["tables"].values())
    report["target_records_verified"] = sum(t["target_verified"] for t in report["tables"].values())
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2, default=str) + "\n")
    print(f"Verified {report['target_records_verified']} records across {report['tables_migrated']} tables; report: {args.report}")


if __name__ == "__main__":
    main()
