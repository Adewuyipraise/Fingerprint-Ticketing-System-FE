# 🚀 Quick Start - CDK CanteenTrack Backend

## 📍 Backend Folder
```
📦 c:\Users\timothyogundele\Videos\canteen-ticket-backend\
```

## ⚡ 3-Step Quick Start

### Step 1: Install & Setup Database (5 minutes)
```bash
cd c:\Users\timothyogundele\Videos\canteen-ticket-backend
npm install
npm run setup-db
```

### Step 2: Start Backend (Keep running)
```bash
npm run dev
```
Should show: ✓ Backend server running on http://localhost:3001

### Step 3: Create Test Users (Choose ONE method)

**Method A: Using API (Easier - Requires backend from Step 2 running)**
```bash
# In another terminal
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123","role":"admin","zk_user_id":"001"}'

curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"hr@company.com","password":"hr123","role":"hr","zk_user_id":"002"}'

curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"canteen@company.com","password":"canteen123","role":"canteen_rep","zk_user_id":"003"}'
```

**Method B: Using SQL (Direct)**
```sql
-- Connect to PostgreSQL and run:
INSERT INTO auth_users (email, password, role, zk_user_id) VALUES
('admin@company.com', 'admin123', 'admin', '001'),
('hr@company.com', 'hr123', 'hr', '002'),
('canteen@company.com', 'canteen123', 'canteen_rep', '003');
```

## 🧪 Test Backend

```bash
# Check health
curl http://localhost:3001/health

# Login and get token
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123"}'

# Save the token from response, then test
curl -X GET http://localhost:3001/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🎨 Frontend Testing

**In a NEW terminal:**
```bash
cd c:\Users\timothyogundele\Videos\canteen-ticket
npm run dev
```

Open: http://localhost:3000

Login with:
- **Email:** admin@company.com
- **Password:** admin123

---

## 📚 Full Documentation
- API Details → `canteen-ticket-backend/README.md`
- Setup Guide → `canteen-ticket-backend/SETUP_GUIDE.md`

## ✅ Success = Both Running
- ✓ Backend: http://localhost:3001
- ✓ Frontend: http://localhost:3000
- ✓ Can log in and see data

---

**Issues?** Check SETUP_GUIDE.md Troubleshooting section
