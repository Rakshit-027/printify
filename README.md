# PrintFlow: Online Printing & Vendor Management Platform

[![Node.js LTS](https://img.shields.io/badge/Node.js-v20%20LTS-green.svg)](https://nodejs.org/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14%20App%20Router-black.svg)](https://nextjs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.4%20Migration-blue.svg)](https://www.mysql.com/)
[![Azure Blob Storage](https://img.shields.io/badge/Azure%20Storage-Central%20India-0078d4.svg)](https://azure.microsoft.com/)
[![Razorpay](https://img.shields.io/badge/Payments-Razorpay%20Checkout-0c2340.svg)](https://razorpay.com/)
[![Electron](https://img.shields.io/badge/Desktop-Electron%20Windows-47848F.svg)](https://www.electronjs.org/)

---

## 1. System Overview

**PrintFlow** is a complete, production-oriented cloud printing and vendor management platform designed to connect customers directly with local xerox/printing businesses.

### The Customer Journey
1. **Counter QR Scan**: Customer walks into a print shop, scans a physical QR counter standee with their phone, and lands on `/v/[vendorSlug]`. Zero application install required.
2. **Direct-to-Blob Upload**: Customer uploads PDF or images. Files stream directly to private Azure Blob Storage containers via short-lived, single-blob SAS URLs, avoiding VPS memory bloat.
3. **Live Deterministic Price Calculation**: Immediate calculation separating physical sheets from printed sides for duplex printing, copy multipliers, and minimum order thresholds.
4. **Payment Options**: Online payment via Razorpay Checkout or Cash on Desk.
5. **Real-time Order Tracking**: Customer tracks live progress via unguessable 32-character tokens (`/track/[token]`), receives a pickup QR verification plaque, and collects their physical prints.

### The Vendor Journey
1. **Vendor Portal (`/vendor`)**: Real-time queue for orders awaiting approval, in print spooler, ready for pickup, and completed.
2. **Cash Collection Guard**: Clear separation between order approval and physical counter cash collection.
3. **Downloadable Counter Standee**: Instant high-resolution vector SVG plaque generator with instructions and QR code for store counters.

### The Windows Desktop Print Agent (`apps/desktop-agent`)
1. **Secure Enrollment**: PC authenticated via one-time vendor enrollment codes.
2. **Local Hardware Discovery**: Automatically detects and registers connected Windows printers via WMI/PowerShell.
3. **Autonomous Job Polling & Spooling**: Claims jobs with ephemeral lock leases, downloads documents using short-lived download SAS URLs, submits to the Windows spooler, and updates statuses in real time.
4. **Anti-Reprint Reliability**: Uncertain physical print outcomes are safely routed to manual review rather than executing duplicate prints.

---

## 2. Monorepo Repository Structure

```text
print-platform/
├── apps/
│   ├── web/                           # Next.js 14 App Router, Tailwind CSS, API Handlers
│   │   ├── app/
│   │   │   ├── (public)/              # Marketing landing page
│   │   │   ├── v/[vendorSlug]/        # Public vendor counter QR ordering flow
│   │   │   ├── track/[token]/         # Real-time customer tracking & pickup plaque
│   │   │   ├── pay/[token]/           # Razorpay Checkout payment portal
│   │   │   ├── vendor/                # Multi-tenant vendor management dashboard
│   │   │   ├── admin/                 # Platform administrator command center
│   │   │   └── api/                   # Modular REST route handlers
│   │   ├── lib/                       # Core services (Auth, Azure Storage, Razorpay, Pricing, Retention)
│   │   └── __tests__/                 # 6 automated test suites covering all core workflows
│   │
│   ├── desktop-agent/                 # Windows Electron Desktop Application
│   │   ├── src/main/                  # Electron Main Process, printer service, background worker
│   │   ├── src/preload/               # Context-isolated preload bridge (zero Node.js leakage)
│   │   └── src/renderer/              # React desktop interface with live terminal stream
│   │
│   └── background-worker/             # Autonomous VPS Document Retention & Reaper Worker
│       └── src/retention-cleanup.ts   # Standalone CLI script for cron or systemd timers
│
├── packages/
│   ├── database/                      # Prisma schema (25 MySQL models), baseline migration, seed script
│   └── shared-types/                  # Shared Zod schemas, domain enums, and DTOs
│
├── deploy/                            # Production Ubuntu 24.04 LTS deployment configs
│   ├── nginx/printflow.conf           # Reverse proxy with TLS 1.3, rate limits, and 4GB buffer tuning
│   ├── pm2/ecosystem.config.js        # PM2 cluster configuration (2 workers, 900M memory limit)
│   ├── systemd/                       # Systemd web service and retention timer definitions
│   └── backup/                      # Original PostgreSQL and post-cutover MySQL backup scripts
│
├── DEPLOYMENT.md                      # Comprehensive Ubuntu 24.04 LTS production runbook
└── package.json                       # Root workspaces configuration
```

---

## 3. Getting Started Locally

### Prerequisites
- Node.js v20+ LTS
- npm v10+

### Step 1: Install Dependencies
```bash
cd print-platform
npm install
```

### Step 2: Configure Environment Variables
Set distinct `MYSQL_PASSWORD` and `MYSQL_ROOT_PASSWORD` environment variables for the
local Compose database, then run `docker compose up -d db`. These are development-only
secrets; keep them out of Git and use the application password below.
Inside `apps/web/.env`:
```ini
DATABASE_URL="mysql://printify_user:YOUR_LOCAL_PASSWORD@localhost:3306/printify_db?connection_limit=10"
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
JWT_SECRET="printflow-development-secret-key-at-least-32-chars-long!"
SESSION_MAX_AGE_SECONDS=604800

# Azure Blob Storage (leave empty to use built-in local development mock mode)
AZURE_STORAGE_ACCOUNT_NAME=""
AZURE_STORAGE_ACCOUNT_KEY=""
AZURE_STORAGE_CONTAINER_NAME="printflow-customer-documents"
AZURE_SAS_EXPIRY_MINUTES=15

# Razorpay (leave default test keys to use built-in simulation mode)
RAZORPAY_KEY_ID="rzp_test_YourTestKeyId"
RAZORPAY_KEY_SECRET="yourRazorpayTestKeySecret"
RAZORPAY_WEBHOOK_SECRET="yourRazorpayWebhookSecret"
```

### Step 3: Initialize a new empty local database & seed
```bash
cd packages/database
npx prisma generate
npx prisma migrate deploy
npx tsx prisma/seed.ts # only in disposable development databases
cd ../..
```

### Step 4: Run the Web Application
```bash
cd apps/web
npm run dev
# Platform running at http://localhost:3000
```

- **Customer QR Demo**: `http://localhost:3000/v/speedy-express`
- **Vendor Portal**: `http://localhost:3000/vendor` (Demo user: `vendor@speedyprint.com` / `Vendor@123456`)
- **Admin Portal**: `http://localhost:3000/admin` (Demo user: `admin@printflow.io` / `Admin@123456`)

---

## 4. Running repository checks

Export `DATABASE_URL` for a disposable MySQL test database before running these
commands; never use production data:

```bash
npm test
cargo test --manifest-path apps/server/Cargo.toml
RUN_MYSQL_SMOKE=1 npm --workspace=packages/database run smoke:mysql
python3 -m unittest discover -s migration -p 'test_*.py'
```

See [migration/README.md](migration/README.md) for actual checks run and outstanding
database-backed, client and performance verification.

---

## 5. Azure Blob Storage Cost Analysis & Recommendations

| Assumption | Monthly Baseline |
| :--- | :--- |
| **Orders** | ~1,000 orders/month |
| **Average File Size** | 5 MB/order |
| **Monthly Upload Volume** | ~5 GB/month |
| **Retention Policy** | 30 days (purged via automated retention worker) |
| **Region** | Central India |
| **Tier** | Hot Tier, Locally-Redundant Storage (LRS) |

### Estimated Azure Costs:
- **Data Storage (Hot LRS in Central India)**: ~$0.021 per GB/month ➔ **~$0.11 / month**.
- **Transactions (Write/PutBlob SAS operations)**: ~$0.065 per 10,000 operations ➔ **~$0.02 / month**.
- **Data Egress (Downloads to Print Agent)**: 5 GB to local PCs ➔ **~$0.40 / month**.
- **Total Estimated Azure Storage**: **< $1.00 USD / month** for 1,000 orders.

*Note: Azure storage, transfer, and transaction fees are strictly usage-dependent. Always configure Azure Cost Alerts and Budget Thresholds in the Azure Portal.*

---

## 6. Production Deployment

For MySQL staging, data verification, cutover and rollback, follow [migration/README.md](migration/README.md). The previous PostgreSQL instructions remain in [DEPLOYMENT.md](DEPLOYMENT.md) for rollback only; do not switch production traffic until the staged checks have passed.
