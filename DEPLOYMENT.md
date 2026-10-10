# PrintFlow - Production Deployment Runbook
## Target Environment: Ubuntu Server 24.04 LTS (2 vCPUs, 4 GB RAM, 50 GB NVMe)

This guide documents the end-to-end production deployment process for the PrintFlow Online Printing & Vendor Management Platform. It is specifically calibrated for a resource-constrained 4 GB RAM / 2-core VPS.

---

## 1. Server Preparation & Non-Root Deployment User

Connect to your VPS via SSH as `root` and update system packages:

```bash
apt update && apt upgrade -y
apt install -y curl wget git build-essential ufw unattended-upgrades
```

Create a dedicated non-root service account with sudo privileges:

```bash
adduser --gecos "" printflow
usermod -aG sudo printflow
```

Configure SSH key authentication for the `printflow` user, then switch to the user:

```bash
su - printflow
```

---

## 2. Firewall Configuration (UFW)

Lock down all ports except SSH, HTTP, and HTTPS:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status verbose
```

> [!IMPORTANT]
> Port 5432 (PostgreSQL) is deliberately **not** exposed to the public internet. It binds only to `127.0.0.1` locally.

---

## 3. Node.js LTS Installation

Install the current supported Node.js LTS (v20 or v22) via NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v # Should return v20.x.x
npm -v  # Should return 10.x.x+
```

Install PM2 globally for production cluster process supervision:

```bash
sudo npm install -g pm2
```

---

## 4. PostgreSQL 16 Installation & Secure Configuration

Install PostgreSQL 16 on Ubuntu 24.04:

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### Tune PostgreSQL for 4 GB RAM VPS
Edit `/etc/postgresql/16/main/postgresql.conf`:

```ini
# Memory Configuration for 4GB VPS (Leave 2.5GB for Node.js, Nginx, and OS)
shared_buffers = 512MB
effective_cache_size = 1536MB
work_mem = 16MB
maintenance_work_mem = 128MB
max_connections = 40
listen_addresses = '127.0.0.1'
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

---

## 5. Database & User Creation (Least Privilege)

Log in to the PostgreSQL prompt as `postgres`:

```bash
sudo -u postgres psql
```

Execute SQL commands:

```sql
CREATE USER printflow_user WITH ENCRYPTED PASSWORD 'ReplaceWithStrongSecurePassword2026!';
CREATE DATABASE printflow_db OWNER printflow_user;
GRANT ALL PRIVILEGES ON DATABASE printflow_db TO printflow_user;
\c printflow_db
GRANT ALL ON SCHEMA public TO printflow_user;
\q
```

Verify local connection:

```bash
psql -U printflow_user -d printflow_db -h localhost -W
```

---

## 6. Repository Setup & Environment Configuration

Clone repository as `printflow` user into `/home/printflow/print-platform`:

```bash
cd /home/printflow
git clone https://github.com/your-org/print-platform.git
cd print-platform
```

Create production `.env` inside `apps/web/.env`:

```bash
cat << 'EOF' > apps/web/.env
# Database Connection (Connection pool limit set to 10 for low-memory bound)
DATABASE_URL="postgresql://printflow_user:ReplaceWithStrongSecurePassword2026!@localhost:5432/printflow_db?schema=public&connection_limit=10"

# Application URLs
NODE_ENV="production"
PORT=3000
NEXT_PUBLIC_APP_URL="https://your-domain.com"

# Session Security (Use a 64-character random hex key)
JWT_SECRET="generate_with_openssl_rand_hex_32"
SESSION_MAX_AGE_SECONDS=604800

# Microsoft Azure Blob Storage (Central India region, Hot Tier)
AZURE_STORAGE_ACCOUNT_NAME="yourstorageaccount"
AZURE_STORAGE_ACCOUNT_KEY="yourAzureStorageAccountPrimarySecretKey"
AZURE_STORAGE_CONTAINER_NAME="printflow-customer-documents"
AZURE_SAS_EXPIRY_MINUTES=15

# Razorpay Production API Credentials
RAZORPAY_KEY_ID="rzp_live_YourLiveKeyId"
RAZORPAY_KEY_SECRET="YourLiveKeySecret"
RAZORPAY_WEBHOOK_SECRET="YourConfiguredWebhookSecret"
EOF

chmod 600 apps/web/.env
```

---

## 7. Prisma Migrations & Database Seeding

Install workspace dependencies and deploy production schema:

```bash
npm install
cd packages/database
npx prisma generate
npx prisma migrate deploy
npx tsx prisma/seed.ts
cd ../..
```

---

## 8. Production Next.js Build

Build optimized Next.js static and server assets:

```bash
cd apps/web
npm run build
cd ../..
```

---

## 9. PM2 Process Management & Cluster Setup

Create log directories with proper permissions:

```bash
sudo mkdir -p /var/log/printflow
sudo chown -R printflow:printflow /var/log/printflow
```

Start PM2 cluster:

```bash
pm2 start deploy/pm2/ecosystem.config.js
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u printflow --hp /home/printflow
```

Check cluster status:

```bash
pm2 list
pm2 status
```

---

## 10. Nginx Reverse Proxy Setup & TLS 1.3

Install Nginx:

```bash
sudo apt install -y nginx
sudo cp deploy/nginx/printflow.conf /etc/nginx/sites-available/printflow.conf
sudo ln -s /etc/nginx/sites-available/printflow.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

Test configuration syntax:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 11. HTTPS Certificates via Let's Encrypt (Certbot)

Install Certbot and acquire certificate:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Test automatic renewal:

```bash
sudo certbot renew --dry-run
```

---

## 12. Azure Blob Storage Setup (Central India)

1. Open **Azure Portal** ➔ **Storage accounts** ➔ **Create storage account**.
2. **Account type**: Standard general-purpose v2.
3. **Region**: `(Asia Pacific) Central India`.
4. **Redundancy**: `Locally-redundant storage (LRS)` for cost efficiency.
5. Under **Data protection**:
   - Ensure **Allow public access to containers** is set to **Disabled**.
6. Create container named `printflow-customer-documents` with access level **Private (no anonymous access)**.
7. Under **Access keys**, copy `Key 1` into `AZURE_STORAGE_ACCOUNT_KEY`.

---

## 13. Razorpay Live Mode & Webhook Registration

1. Log into **Razorpay Dashboard** (Live Mode).
2. Go to **Settings ➔ API Keys** and generate Live Key ID & Secret.
3. Go to **Settings ➔ Webhooks ➔ Add New Webhook**:
   - **Webhook URL**: `https://your-domain.com/api/webhooks/razorpay`
   - **Secret**: Copy into `RAZORPAY_WEBHOOK_SECRET` in `.env`
   - **Active Events**:
     - `order.paid`
     - `payment.captured`
     - `payment.failed`
     - `refund.processed`
4. Confirm test ping in dashboard.

---

## 14. Document Retention Systemd Timer Setup

Enable the automatic retention cleanup timer:

```bash
sudo cp deploy/systemd/printflow-retention.service /etc/systemd/system/
sudo cp deploy/systemd/printflow-retention.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now printflow-retention.timer
sudo systemctl list-timers | grep printflow
```

---

## 15. Automated Database Backups Setup

Set up daily automated offsite backup script:

```bash
sudo cp deploy/backup/backup-db.sh /usr/local/bin/backup-db.sh
sudo chmod +x /usr/local/bin/backup-db.sh
```

Add to cron (`sudo crontab -e`):

```cron
0 3 * * * /usr/local/bin/backup-db.sh >> /var/log/printflow/backup.log 2>&1
```

---

## 16. Log Rotation Configuration

Create `/etc/logrotate.d/printflow`:

```bash
sudo tee /etc/logrotate.d/printflow << 'EOF'
/var/log/printflow/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 printflow printflow
    sharedscripts
    postrotate
        pm2 reloadLogs > /dev/null 2>&1 || true
    endscript
}
EOF
```

---

## 17. Safe Deployment & Rollback Workflow

### Zero-Downtime Update:
```bash
cd /home/printflow/print-platform
git pull origin main
npm install --production=false
cd packages/database && npx prisma migrate deploy && cd ../..
cd apps/web && npm run build && cd ../..
pm2 reload printflow-web
```

### Rollback (if errors detected):
```bash
git checkout HEAD~1
cd apps/web && npm run build && cd ../..
pm2 reload printflow-web
```

---

## 18. Windows Desktop Print Agent Packaging & Distribution

On a Windows build machine:

```powershell
git clone https://github.com/your-org/print-platform.git
cd print-platform\apps\desktop-agent
npm install
npm run build
npm run package:win
```

The installer `PrintFlow-Agent-Setup-1.0.0.exe` will be generated inside `dist/`. Distribute this executable to vendor shops. When opened on the counter PC, vendor enters their one-time code generated from their portal to link their local printers.
