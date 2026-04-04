# Personal Finance App — MacOS Deployment Guide

Step-by-step guide to deploy the application locally on MacOS using PM2 for persistent process management.

---

## Prerequisites

- **Node.js** v22+ — [Download](https://nodejs.org/)
- **PM2** — Install globally:
  ```bash
  npm install -g pm2
  ```

---

## Automated Installation

The easiest way to perform a fresh installation is to use the included `install.sh` script. This automates the environment setup, dependency installation, database generation, and PM2 startup.

```bash
# Make sure you have PM2 installed globally first
npm install -g pm2

# Run the automated installer
./install.sh
```

---

## Manual Installation (Alternative)

### 1. Environment Setup

Copy the environment template and configure it:

```bash
cp backend/.env.example backend/.env
```


Edit `backend/.env` with your preferred values:

```env
DATABASE_URL="file:./dev.db"
PORT=5001
NODE_ENV=production
```

> **Note:** `DATABASE_URL` points to the SQLite file relative to the `backend/` directory.

---

## 2. Install Dependencies

```bash
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

---

## 3. Database Setup

Generate the Prisma client, run migrations, and optionally seed the database with defaults:

```bash
cd backend
npx prisma generate
npx prisma migrate deploy

# Optional: Seed the database with default categories, currencies, and languages
node seed.js

# Optional: If you need to completely wipe the existing database before seeding
node seed.js --flush

cd ..
```

---

## 4. Build the Frontend

Create the production-ready bundle:

```bash
cd frontend
npm run build
cd ..
```

This generates the `frontend/dist/` directory served by the backend in production mode.

---

## 5. Launch with PM2

```bash
pm2 start ecosystem.config.cjs
```

The application will be available at: **http://localhost:5001**

---

## 6. Verify

| Command                         | Purpose            |
| ------------------------------- | ------------------ |
| `pm2 status`                    | Check process status |
| `pm2 logs personal-finance-app` | View live logs     |
| `curl http://localhost:5001/api/health` | API health check   |

---

## Managing the Application

| Action          | Command                            |
| --------------- | ---------------------------------- |
| Stop            | `pm2 stop personal-finance-app`    |
| Restart         | `pm2 restart personal-finance-app` |
| Delete          | `pm2 delete personal-finance-app`  |

---

## Auto-Start on Reboot

To have PM2 and your app start automatically when your Mac boots:

```bash
pm2 save
pm2 startup
```

Follow the instructions printed by `pm2 startup` — it will output a command you need to copy and run with `sudo`.

---

## Updating the Application

When new features or bug fixes are pushed to the main repository, you can safely update your local deployment using the included `update.sh` script.

Run the script from the application root:

```bash
./update.sh
```

This script will automatically:
1. Pull the latest code from `origin main`.
2. Install any new dependencies for both the frontend and backend.
3. Apply database schema updates safely (using `prisma db push`).
4. Rebuild the frontend static production bundle.
5. Restart the PM2 process.

---

## Database Backup & Restore

### Backup

The database is a single SQLite file at `backend/dev.db`. To back it up:

```bash
cp backend/dev.db backend/dev.db.backup-$(date +%Y%m%d)
```

### Restore

```bash
pm2 stop personal-finance-app
cp backend/dev.db.backup-YYYYMMDD backend/dev.db
pm2 restart personal-finance-app
```

---

## Troubleshooting

| Issue                        | Solution                                                                 |
| ---------------------------- | ------------------------------------------------------------------------ |
| Port 5001 already in use     | `lsof -i :5001` to find the process, then `kill -9 <PID>`               |
| Frontend shows blank page    | Ensure `npm run build` was run and `frontend/dist/` exists               |
| Database errors              | Run `cd backend && npx prisma migrate deploy`                            |
| PM2 not found                | Run `npm install -g pm2`                                                 |
| App crashes on startup       | Check logs: `pm2 logs personal-finance-app` or `cat logs/err.log`        |

---

## Public Access via Cloudflare Tunnel

To securely access your local dashboard from the public internet (without port-forwarding your home router), the best approach is using **Cloudflare Tunnels**. 

### 1. Quick Temporary Access (No Domain Required)
If you just want to test on your phone instantly via a temporary random URL:

1. Install `cloudflared` via Homebrew:
   ```bash
   brew install cloudflare/cloudflare/cloudflared
   ```
2. Start a Quick Tunnel pointing to the PM2 port:
   ```bash
   cloudflared tunnel --url http://localhost:5001
   ```
3. Look for the output line: `https://<random-words>.trycloudflare.com`. This is your secure public link.

### 2. Permanent Setup (Requires a Cloudflare Account & Domain)
To bind the app to a custom domain (e.g., `budget.yourdomain.com`) permanently:

1. Log in to Cloudflare from your terminal:
   ```bash
   cloudflared tunnel login
   ```
2. Create a new tunnel:
   ```bash
   cloudflared tunnel create finance-app
   ```
3. Route your domain to the tunnel:
   ```bash
   cloudflared tunnel route dns finance-app budget.yourdomain.com
   ```
4. Create a configuration file at `~/.cloudflared/config.yml`:
   ```yaml
   tunnel: <Tunnel-UUID-from-step-2>
   credentials-file: /Users/<your-user>/.cloudflared/<Tunnel-UUID>.json

   ingress:
     - hostname: budget.yourdomain.com
       service: http://localhost:5001
     - service: http_status:404
   ```
5. Install and run the tunnel as a persistent background service (just like PM2):
   ```bash
   sudo cloudflared service install
   sudo cloudflared service start
   ```
