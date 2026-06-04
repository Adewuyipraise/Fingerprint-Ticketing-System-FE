# Complete Setup Guide - CDK CanteenTrack

## Overview
This guide will walk you through setting up and testing the complete CDK CanteenTrack system with frontend and backend.

---

## ✅ Phase 1: Backend Setup

### Step 1: Navigate to Backend Folder
```bash
cd c:\Users\timothyogundele\Videos\canteen-ticket-backend
```

### Step 2: Install Dependencies
```bash
npm install
```
This installs all required packages (Express, PostgreSQL, JWT, bcrypt, etc.)

### Step 3: Initialize Database
```bash
npm run setup-db
```
This creates the `auth_users` and `audit_logs` tables in your PostgreSQL database.

### Step 4: Create Test Users
Connect to your PostgreSQL database and run these SQL commands to create test users:

```sql
-- Hash passwords using bcrypt (see note below)
-- admin123 hashed: $2a$10$abcdef...
-- hr123 hashed: $2a$10$ghijkl...
-- canteen123 hashed: $2a$10$mnopqr...

INSERT INTO auth_users (email, password, role, zk_user_id) VALUES
('admin@company.com', '$2a$10$abcdef...', 'admin', '001'),
('hr@company.com', '$2a$10$ghijkl...', 'hr', '002'),
('canteen@company.com', '$2a$10$mnopqr...', 'canteen_rep', '003');
```

**OR** use the API endpoint to register users (easier):

```bash
# Terminal 1: Start backend (see Step 5 below first)

# Terminal 2: Register users
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "admin123",
    "role": "admin",
    "zk_user_id": "001"
  }'

curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hr@company.com",
    "password": "hr123",
    "role": "hr",
    "zk_user_id": "002"
  }'

curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "canteen@company.com",
    "password": "canteen123",
    "role": "canteen_rep",
    "zk_user_id": "003"
  }'
```

### Step 5: Start Backend Server
```bash
npm run dev
```

Output should show:
```
✓ Database connected: 2026-04-23 10:30:45.123456+02
✓ Backend server running on http://localhost:3001
✓ CORS enabled for http://localhost:3000
```

**Note:** Keep this terminal open. The backend must be running for the frontend to work.

---

## ✅ Phase 2: Frontend Setup & Integration

### Step 1: Navigate to Frontend Folder (New Terminal/Tab)
```bash
cd c:\Users\timothyogundele\Videos\canteen-ticket
```

### Step 2: Verify API Configuration
The frontend is already configured to use `http://localhost:3001` ✓

Check `.env.local` file - you should see:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Step 3: Start Frontend Server
```bash
npm run dev
```

Output should show:
```
  ➜  Local:   http://localhost:3000
```

Open your browser to `http://localhost:3000`

---

## ✅ Phase 3: Test the Complete Flow

### Test 1: Login Page
1. Navigate to `http://localhost:3000`
2. You should be redirected to `/login` (loading spinner then login form)
3. Log in with one of the test accounts:
   - **Email:** `admin@company.com`
   - **Password:** `admin123`
   - **Role:** Admin (all features)

   OR

   - **Email:** `hr@company.com`
   - **Password:** `hr123`
   - **Role:** HR (limited features)

✓ **Expected Result:** Dashboard loads with employee and ticket data from PostgreSQL

### Test 2: Dashboard
1. Verify the dashboard loads
2. Check statistics are correct:
   - Total Employees (from `users` table)
   - Total Records (from `tickets` table)
   - Daily Meal Count (tickets from today)
3. Check charts are populated with data

### Test 3: Employees Page
1. Navigate to Dashboard → Employees
2. Verify employees are listed from the `users` table
3. Test search functionality
4. Test filtering by department/position

### Test 4: Tickets Page
1. Navigate to Dashboard → Tickets
2. Verify meal records are listed from `tickets` table
3. Test date filtering
4. Test search functionality

### Test 5: Reports & Analytics
1. Navigate to Dashboard → Reports
2. Verify charts show data
3. Verify export functionality (if available)

### Test 6: Logout
1. Click logout button
2. You should be redirected to `/login`
3. Verify token is cleared from localStorage

---

## 🔧 Troubleshooting

### Backend won't start: "Database connection failed"
**Problem:** PostgreSQL not accessible at 172.17.1.80:5432

**Solutions:**
1. Verify PostgreSQL is running on the network machine
2. Test connection from command line:
   ```bash
   psql -h 172.17.1.80 -U postgres -d fingerprint_ticket_db
   ```
3. Check firewall allows connections from your machine
4. Verify .env credentials are correct

### Frontend shows login page but can't log in
**Problem:** Backend not running or API error

**Solutions:**
1. Verify backend is running: `http://localhost:3001/health`
2. Check browser console (F12) for error messages
3. Check backend terminal for error logs
4. Verify auth_users table has test data

### "Invalid email or password" after login
**Problem:** Users not created or password mismatch

**Solutions:**
1. Verify users exist in auth_users table:
   ```sql
   SELECT email, role FROM auth_users;
   ```
2. Re-create users using the API `/register` endpoint
3. Ensure zk_user_id matches a user in the `users` table

### Dashboard shows "Cannot load stats"
**Problem:** Failed to fetch from backend

**Solutions:**
1. Check backend is running
2. Verify token is valid (check browser console)
3. Check backend logs for errors
4. Verify `users` and `tickets` tables exist in database

### CORS error in browser console
**Problem:** Origin not allowed

**Solution:**
- Backend is set to allow `http://localhost:3000`
- If running on different port, update CORS in backend `src/index.ts`

---

## 📊 Database Verification

Check data in your PostgreSQL database:

```sql
-- Check auth users
SELECT * FROM auth_users;

-- Check existing users
SELECT COUNT(*) FROM users;

-- Check existing tickets
SELECT COUNT(*) FROM tickets;

-- Check recent tickets
SELECT ticket_number, name, event_date FROM tickets ORDER BY event_date DESC LIMIT 10;
```

---

## 🚀 Next Steps (After Successful Testing)

1. **Add More Features:**
   - Employee CRUD (Create, Update, Delete)
   - Bulk upload functionality
   - Advanced filtering and exporting

2. **Production Deployment:**
   - Set secure JWT secret in production
   - Configure environment variables
   - Setup HTTPS
   - Deploy to production server

3. **Security Updates:**
   - Change JWT_SECRET in .env
   - Add rate limiting to API
   - Add input validation
   - Add logging and monitoring

---

## 📝 Important Notes

- **Backend runs on port 3001** (change in .env if needed)
- **Frontend runs on port 3000**
- **Both must be running** for the system to work
- **JWT tokens expire after 7 days** (configurable in .env)
- **Passwords are hashed with bcrypt** for security
- **Database credentials are in both .env files** - keep secure!

---

## ✓ Success Checklist

- [ ] Backend installed and running
- [ ] Database connected successfully
- [ ] Test users created
- [ ] Frontend dashboard loads
- [ ] Can log in with test credentials
- [ ] Dashboard shows employee count
- [ ] Dashboard shows ticket count
- [ ] Dashboard shows daily meal count
- [ ] Employees page lists users
- [ ] Tickets page lists meal records
- [ ] Logout works

Once all items are checked, your system is ready! 🎉
