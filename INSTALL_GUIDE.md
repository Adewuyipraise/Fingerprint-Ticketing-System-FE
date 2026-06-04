# CanteenTrack Installation Guide

## Prerequisites

1. **Node.js** (v18 or later) - Download from https://nodejs.org/
2. **PostgreSQL** (v14 or later) - Download from https://www.postgresql.org/download/
   - During installation, set the password for the `postgres` user
   - Remember this password for later steps

## Quick Start (Automatic Installation)

1. Run `CanteenTrack-Setup.exe`
2. Follow the installation wizard
3. After installation, the system will start automatically

## Manual Setup

### 1. Install Dependencies

```bash
# Backend
cd canteen-ticket-backend
npm install

# Frontend
cd ../canteen-ticket
npm install
```

### 2. Configure Environment Variables

Edit `canteen-ticket-backend\.env` and update:
- `DB_PASSWORD`: Your PostgreSQL password
- `DB_NAME`: Database name (default: fingerprint_ticket_db)
- `JWT_SECRET`: A secure random string

### 3. Run the System

Double-click `start-all.bat` in the root directory

## Default Login

- **Email**: admin@canteen.com
- **Password**: admin123

**IMPORTANT**: Change the default password immediately after first login!