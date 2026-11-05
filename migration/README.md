# Print2Me PostgreSQL → MySQL migration runbook (NOT a production cutover record)

**State:** repository-side compatibility work prepared; live PostgreSQL version, actual schema,
backup validity, data counts, MySQL connectivity, workflows and performance are **not verified**.
No production database was read, changed, switched or deleted. Do **not** switch traffic on the
strength of a successful build, a seed, or the generated SQL alone.

## Architecture and audit map

The repository contains two server-side database clients: `packages/database` provides Prisma
5.22 to the Next.js customer/vendor/admin API route handlers and the standalone
`background-worker/src/retention-cleanup.ts`; `apps/server/src/db`, `apps/server/src/api` and
`apps/server/src/workers` use Rust Axum + SQLx 0.7. The Next.js app also uses Prisma in its
server-rendered shop/locations/sitemap pages. Both must use the same MySQL schema. Desktop
Electron, the React Native app and `sveltekit-frontend` use HTTP APIs, not database credentials;
no API paths, request bodies or response formats are intentionally changed.

The source of truth for the **repository schema** is
`packages/database/prisma/schema.prisma` (mirrored in `prisma/schema.prisma`). It declares
25 tables:

| Area | Tables |
| --- | --- |
| Identity | User, EmailVerificationToken, VendorMembership, AuditLog |
| Vendors / payments | Vendor, VendorQrConfig, VendorPaymentAccount, VendorPricing |
| Devices / printing | Device, Printer, PrintJob, PrintJobEvent |
| Uploads / orders | Document, DocumentUploadSession, Order, OrderItem |
| Financial | Payment, Refund, SubscriptionPlan, VendorSubscriptionInvoice, Coupon, CouponRedemption |
| Reliability | WebhookEvent, RetentionTask, VendorFcmToken |

The Prisma files are the complete column, PK, unique, index, FK, default and referential-action
inventory. `Order.vendorId` and `OrderItem.documentId` are `Restrict`; nullable device/printer,
audit user and invoice plan FKs are `SetNull`; other declared FKs use `Cascade`. Not every
logical reference has a DB FK (`PrintJob.vendorId`, `DocumentUploadSession.vendorId`,
`VendorFcmToken.vendorId/userId`); these are preserved, not silently discarded. No migration,
trigger, stored routine or view files were found in this repository before this change; a live
PostgreSQL audit is mandatory to determine whether any exist in production. The previous local
Compose image was PostgreSQL 15; `DEPLOYMENT.md` describes PostgreSQL 16; the **actual production
version is unknown** without a connection. The existing PostgreSQL backup script is
`deploy/backup/backup-db.sh`; no backup content was inspected.

The Rust API originally used PostgreSQL `$n` parameters, double-quoted identifiers, enum casts,
`ON CONFLICT`, `EXCLUDED`, `RETURNING`, an enum array cast and `UPDATE … FROM`. Those are changed
to MySQL `?`, backticks, string/enum values, `ON DUPLICATE KEY UPDATE`, `VALUES(column)`,
insert-then-select by stable ID within a transaction, JSON arrays and `UPDATE … JOIN`. `FOR
UPDATE` still locks rows; `NOW(6)` preserves microseconds. Prisma does not use raw SQL in the
audited route handlers. Source column arrays (`Printer.supportedSizes`,
`Coupon.applicablePlanCodes`) become JSON arrays without changing the HTTP array shape.

Other types: string UUIDs and existing primary keys remain strings; `BigInt` remains `BIGINT`;
amounts remain **integer minor currency units** (no floating-point conversion); enums retain
their existing values; JSON/JSONB and nullable JSON map to MySQL JSON; booleans to MySQL boolean;
timestamps to UTC `DATETIME(6)`; large non-indexed notes/names/tokens to `TEXT`. Indexed blob keys
use `VARCHAR(512)`; **values exceeding this length or other indexed column lengths stop the copy**.
The baseline uses InnoDB, `utf8mb4_bin` (case-sensitive comparisons/uniques) and existing
relations. Review collation/length collisions against *live* PostgreSQL data before applying.

## Before staging migration: audit, backup, benchmark

1. Freeze writes for the final production copy (including webhook receivers, Next.js, Rust API,
   desktop agent status updates, mobile actions, scheduled workers and seed jobs). A staging
   snapshot rehearsal can be copied while source writes continue but is **not** final cutover
   consistency. Do not run `prisma db push` or seed on existing production data.
2. Identify the exact PostgreSQL endpoint/version and take a full backup using separately
   provided **read-only/source** credentials. Use a secure directory outside the repository:

   ```bash
   umask 077
   pg_dump --format=custom --no-owner --file=/secure/backup/print2me-before-mysql.dump "$POSTGRES_SOURCE_URL"
   pg_restore --list /secure/backup/print2me-before-mysql.dump >/dev/null
   ```

   Test-restore this backup to **another PostgreSQL instance** and check counts and financial
   totals. Keep the original DB, backup and old backend build available throughout cutover.
3. On the source, audit `SELECT version()`, `information_schema.tables/columns`, `pg_indexes`,
   `pg_constraint`, `pg_trigger`, `pg_proc`, `pg_views`, `pg_matviews`, `pg_extension` and the
   migration history. Compare with the 25-table schema **before** proceeding. The copy script
   refuses unknown tables, columns, triggers, functions, views, extensions and unsupported arrays;
   a mismatch must be investigated and ported, never silently skipped. Include documents/blob
   references and rows without declared FKs in a manual integrity review.
4. Capture representative PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)` and API latency/throughput,
   including shop lookup, order placement, payment, vendor queue, tracking and admin reporting.
   Save a baseline outside the repository for a like-for-like MySQL `EXPLAIN ANALYZE` comparison.

## Stage the empty MySQL 8.4 database

Use a dedicated *non-root* application user and a separate migration user with DDL privileges.
For a local disposable environment, set `MYSQL_PASSWORD` and `MYSQL_ROOT_PASSWORD` to distinct
local-only secrets before `docker compose up -d db`; the port binds to loopback only. Production/staging MySQL should
require authenticated TLS, restrict network access and set a consistent UTC server/session time
zone. The Rust SQLx pool sets the UTC session time zone, max 25 connections, min 2; Prisma's
`connection_limit=10` is per process. Budget MySQL `max_connections` for both web workers, Rust
and background processes, not just one client. Monitor pool wait time and slow queries.

Example (run as DBA, substitute securely generated passwords; **do not commit them**):

```sql
CREATE DATABASE printify_db CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE USER 'printify_app'@'10.%' IDENTIFIED BY '<random-secret>';
GRANT SELECT, INSERT, UPDATE, DELETE ON printify_db.* TO 'printify_app'@'10.%';
-- Run migrations as a separate, restricted DDL-capable account.
```

Use a **fresh empty** MySQL database. Set `DATABASE_URL` to the migration user's MySQL URL and
run `npm --workspace=packages/database run migrate:deploy`, then
`npm run db:generate`. The checked-in `migration.sql` is the initial schema for 25 tables, not an
in-place migration of PostgreSQL. Prisma's migration history is initialized on MySQL only. Check
`SHOW TABLE STATUS` (engine/collation), `SHOW CREATE TABLE`, `information_schema` FK/index lists,
and test the baseline on a separate MySQL instance first. Never replace the source PostgreSQL
database or run a seed in the staging copy.

## Copy and verify (staging first; final only during write freeze)

With `POSTGRES_SOURCE_URL` pointed to the *read-only* PostgreSQL source and
`MYSQL_TARGET_URL` pointed to an **empty** MySQL baseline, install the script requirements in
a disposable Python environment (not in the app):

```bash
python3 -m venv /secure/venvs/print2me-migrate
/secure/venvs/print2me-migrate/bin/pip install -r migration/requirements.txt
export POSTGRES_SOURCE_URL='postgresql://SOURCE_USER:SOURCE_PASSWORD@SOURCE_HOST:5432/print2me'
export MYSQL_TARGET_URL='mysql://TARGET_USER:TARGET_PASSWORD@TARGET_HOST:3306/printify_db?ssl=true'
/secure/venvs/print2me-migrate/bin/python migration/copy_and_verify.py \
  --execute --backup /secure/backup/print2me-before-mysql.dump \
  --report /secure/reports/print2me-mysql-verification.json
```

Use actual secrets from your secrets manager, URL-encode special characters in URLs, avoid shell
history, and never put either URL into desktop/Android builds or `NEXT_PUBLIC_*`. The migration
script uses a read-only repeatable-read PostgreSQL snapshot, validates that both schemas have
exactly the same table and column sets, refuses a nonempty MySQL table, topologically orders
tables by MySQL FK dependencies, copies every field including source IDs, verifies every row and
JSON value before commit, compares exact integer financial amounts and microsecond timestamps,
checks FK joins, then commits all rows in **one transaction**. It does not disable foreign keys
and also checks the five logical references without declared FKs; it does not silently skip
errors. Any error before commit rolls back the data copy; investigate schema,
source/target collation, array values, MySQL column widths and source DB objects before retrying
with a **fresh empty** target. Size MySQL undo logs/disk and the maintenance window for a
single full-data transaction on staging before production. It does not copy PostgreSQL
`_prisma_migrations` metadata (MySQL
has its own migration history). The generated JSON report records actual counts, minor-unit
totals, FK count, DB versions and failures/skips; treat a missing report as **not verified**.

**Important limitation:** the schema-first converter rejects unknown source tables and
columns and cannot automatically migrate arbitrary PostgreSQL routines, views, extensions or
orphaned rows. Those require a reviewed explicit port. `pg_restore --list` verifies that the
backup is recognisable, **not** that it can be restored: perform a test restore too. Backup
capture, migration execution and deployment need separate operator approval and credentials.

## Application and API verification before approval

Set `DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/printify_db?connection_limit=10"` in the
**server-only** environment of Next.js/Prisma, background worker and Rust API (the SQLx pool
uses the same scheme). Set a distinct test URL in CI, a staging URL in staging and a dedicated
production URL only after approval. Provision TLS per the provider's Prisma and SQLx connection
guidance, not via one untested query parameter across both drivers. Review service units and
the retention timer before restarting workers. Existing `apps/server/.env.example` is only an
example; do not commit real `.env` files or run production tests against the source.

Run on the **staging copy**:

```bash
RUN_MYSQL_SMOKE=1 DATABASE_URL="$MYSQL_TARGET_URL" npm --workspace=packages/database run smoke:mysql # disposable staging only
DATABASE_URL="$MYSQL_TARGET_URL" npm test
DATABASE_URL="$MYSQL_TARGET_URL" npm run build:web
DATABASE_URL="$MYSQL_TARGET_URL" cargo test --manifest-path apps/server/Cargo.toml
npm --workspace=apps/desktop-agent run test
```

Smoke-test all existing HTTP routes from customer, vendor, admin, desktop agent and Android
clients without changing their API configuration. Test registration/login, shop discovery/QR,
upload→order→cash/online payment→vendor approval→print claim/spool/status→tracking/refund,
subscription/coupon/partner onboarding, webhooks (including retries), notifications, retention,
admin permissions, invalid credentials and duplicate/concurrent payment requests. Validate
actual Azure document references and printer hardware with a real Windows agent, Android device
and staging Razorpay credentials. Compare API response shapes and financial totals against the
PostgreSQL baseline; run MySQL `EXPLAIN ANALYZE`, compare latency/throughput and index usage with
the earlier baseline. Do not claim a successful client workflow or acceptable performance until
it has been executed and measured.

## Controlled cutover and rollback

1. Rehearse backup, copy, verification and smoke tests on isolated staging. Resolve all schema
   drift and failures; approve the report and performance comparison.
2. Schedule a maintenance window; stop **all** writers and workers (including payment webhooks
   or queue deliveries) so no new writes reach PostgreSQL after the final snapshot. Take a fresh
   `pg_dump`, test it, initialise a *new* empty MySQL target and rerun the copy + verification.
3. Deploy MySQL-compatible Next.js, Rust API and worker together, switching their server-only
   `DATABASE_URL` atomically. Keep existing HTTP endpoints, secrets and frontend/agent/mobile
   binaries unchanged. Run live smoke tests, watch errors, database locks/slow queries, payment
   totals, print job queue and webhook delivery. Only then resume writes/traffic.
4. Until final approval, keep PostgreSQL untouched and its backups running. MySQL backups can be
   enabled with `deploy/backup/backup-mysql.sh` after cutover; do not stop PostgreSQL backups
   prematurely.

**Rollback:** stop all writes immediately; retain a backup of *new* MySQL writes (orders,
payments, refunds, print jobs, subscriptions) for manual reconciliation. Restore the previous
backend/worker build and PostgreSQL-only server configuration; point server-only URLs back to
PostgreSQL and verify source integrity/health before reopening writes. **Do not blindly replay**
MySQL-only financial events into PostgreSQL or discard them; if production MySQL accepted writes,
rollback requires a reconciled forward-replay plan and payment-provider settlement review.
Never reset or delete either source, never force-sync with `db push`, and never enable uncontrolled
dual writes.

## Verification record for this repository-side change

| Measure | Actual result |
| --- | --- |
| Live PostgreSQL production version / source data | Unknown; no live access used |
| PostgreSQL records copied | Not run |
| MySQL records verified / tables / FK relationships | Not run / not run / not run |
| Failed or skipped production records | Unknown (not attempted) |
| Repository MySQL baseline | 25 tables generated; not applied to a live MySQL server here |
| Critical end-to-end workflows / performance comparison | Not run; require staging and production evidence |

Until the live checks and the controlled cutover above pass, **the migration is incomplete**.

### Modified-file inventory and compatibility review

| Files | Change |
| --- | --- |
| `prisma/schema.prisma`, `packages/database/prisma/schema.prisma` | MySQL provider, JSON arrays, UTC-precision date columns, safe long text/uniques, redundant-index removal |
| `packages/database/prisma/migrations/{migration_lock.toml,20261103000000_mysql_baseline/migration.sql}` | InnoDB/utf8mb4-bin empty-database baseline |
| `apps/server/Cargo.toml`, `apps/server/src/main.rs`, `apps/server/src/state.rs` | SQLx MySQL feature, UTC/pool connection |
| `apps/server/src/db/{users,verification,vendors,devices,orders,print_jobs,fcm_tokens}.rs` | MySQL SQL, upserts, array JSON, stable-ID reads, atomic job operations |
| `apps/server/src/api/{auth,orders,agent,uploads,vendor,admin,payments}.rs`, `apps/server/src/workers/retention.rs` | MySQL query syntax, no build-time PostgreSQL macros, payment matching and transaction error handling |
| `apps/web/app/api/vendor/subscription/validate-coupon/route.ts` | Type-safe JSON-array coupon restriction, unchanged response |
| `packages/database/package.json`, `packages/database/src/mysql-smoke.ts`, `migration/{requirements.txt,copy_and_verify.py,test_copy_and_verify.py,test_rust_sql.py,README.md}` | Staging smoke, source-to-target copy/verification, tests/runbook |
| `docker-compose.yml`, `.github/workflows/ci.yml`, `apps/server/.env.example`, `deploy/systemd/{printflow-web,printflow-retention}.service`, `deploy/backup/backup-mysql.sh`, `README.md`, `DEPLOYMENT.md`, `apps/server/README.md` | Local MySQL, isolated CI MySQL service, safe deployment/rollback guidance |

Previously present PostgreSQL-specific raw SQL replaced: positional `$n`, quoted table/field
identifiers, `::Enum` / `::text` casts, `ON CONFLICT … EXCLUDED` upserts, `RETURNING` inserts,
`UPDATE … FROM`, native PostgreSQL enum arrays, and PostgreSQL numeric aggregation return
types. `FOR UPDATE` is retained for transactional locks. No PostgreSQL `ILIKE`, JSONB operator,
materialized view, stored procedure or extension usage was found in checked-in application SQL;
live DB objects remain uninspected. The Rust subscription handlers had references to column
names not present in the Prisma schema; these reads now alias the declared fields, but require
MySQL runtime verification before production use.

Local checks run: both Prisma schemas validated; Prisma Client generated; Rust `cargo test`
**3/3** and `cargo check` passed; the Next.js pricing/auth unit script **22/22** passed; Python
migration/static SQL tests **5/5** passed; TypeScript typecheck passed for web and the new smoke
test. `next build` returned success but logged database-connection errors during static page
generation because no local MySQL instance was running. No MySQL smoke, DB-backed security
suite, client end-to-end run, PostgreSQL restore or performance measurement was run here.
Staging must also resolve any inherited payment/subscription idempotency and mock-payment
security issues observed during review before enabling real traffic; this code change does not
certify those flows as safe.
