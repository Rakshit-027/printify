#!/usr/bin/env bash
# =========================================================================
# PrintFlow - Automated Daily PostgreSQL Backup Script
# Creates compressed dumps and purges archives older than 7 days
# =========================================================================

set -euo pipefail

BACKUP_DIR="/var/backups/printflow"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/printflow_db_${TIMESTAMP}.sql.gz"
DB_NAME="printflow_db"
DB_USER="printflow_user"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

echo "[$(date -u +"%Y-%m-%d %H:%M:%SZ")] 🐘 Starting PostgreSQL backup for database '${DB_NAME}'..."

# Dump and compress database
pg_dump -U "${DB_USER}" -h localhost "${DB_NAME}" | gzip -9 > "${BACKUP_FILE}"
chmod 600 "${BACKUP_FILE}"

FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[$(date -u +"%Y-%m-%d %H:%M:%SZ")] ✅ Backup completed successfully: ${BACKUP_FILE} (${FILE_SIZE})"

# Optional: Sync to offsite cloud storage (e.g., Azure Blob Storage or AWS S3)
# az storage blob upload --account-name backupstorage --container-name offsite-db --file "${BACKUP_FILE}" --name "printflow_db_${TIMESTAMP}.sql.gz"

# Rotate local backups older than 7 days
echo "[$(date -u +"%Y-%m-%d %H:%M:%SZ")] 🧹 Pruning local database backups older than 7 days..."
find "${BACKUP_DIR}" -type f -name "printflow_db_*.sql.gz" -mtime +7 -delete

echo "[$(date -u +"%Y-%m-%d %H:%M:%SZ")] 🏁 Backup rotation finished."
