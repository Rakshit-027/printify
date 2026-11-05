#!/usr/bin/env bash
# After approved cutover only. Retain PostgreSQL backups independently.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/printflow-mysql}"
MYSQL_BACKUP_CONFIG="${MYSQL_BACKUP_CONFIG:?Set MYSQL_BACKUP_CONFIG to a chmod 600 MySQL client option file}"
DB_NAME="${MYSQL_DATABASE:-printify_db}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
if [[ $(stat -c '%a' "$MYSQL_BACKUP_CONFIG") != 600 ]]; then
  echo 'MySQL backup client option file must have mode 600' >&2
  exit 1
fi
backup_file="$BACKUP_DIR/mysql_${DB_NAME}_$(date -u +'%Y%m%d_%H%M%S').sql.gz"
umask 077
mysqldump --defaults-extra-file="$MYSQL_BACKUP_CONFIG" --single-transaction --quick \
  --set-gtid-purged=OFF --default-character-set=utf8mb4 "$DB_NAME" | gzip -9 > "$backup_file"
gzip -t "$backup_file"
echo "MySQL backup verified: $backup_file"
find "$BACKUP_DIR" -maxdepth 1 -type f -name "mysql_${DB_NAME}_*.sql.gz" -mtime +7 -delete
