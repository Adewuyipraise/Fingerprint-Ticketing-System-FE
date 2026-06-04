# Integration & Testing Guide - CDK CanteenTrack

## ✅ Complete System Overview

Your system is now fully configured with:
- **Frontend:** Next.js with React (runs on port 3000)
- **Backend:** Node.js + Express (runs on port 3001)
- **Database:** PostgreSQL on 172.17.1.80 with existing users and tickets tables
- **Authentication:** JWT tokens with role-based access control (Admin, HR, Canteen Rep)

---

## 🚀 Step-by-Step Integration Test

### Phase 1: Start Both Servers

**Terminal 1 - Backend:**
```bash
cd c:\Users\timothyogundele\Videos\canteen-ticket-backend
npm install  # (only first time)
npm run dev
```

Wait for: `✓ Backend server running on http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
cd c:\Users\timothyogundele\Videos\canteen-ticket
npm run dev
```

Wait for: `➜ Local: http://localhost:3000`

### Phase 2: Create Test Users

With backend running, execute in Terminal 3:

```bash
# Admin User
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "admin123",
    "role": "admin",
    "zk_user_id": "001"
  }'

# HR User
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hr@company.com",
    "password": "hr123",
    "role": "hr",
    "zk_user_id": "002"
  }'

# Canteen Rep User
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "canteen@company.com",
    "password": "canteen123",
    "role": "canteen_rep",
    "zk_user_id": "003"
  }'
```

**Expected Response for each:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid-string",
    "email": "admin@company.com",
    "role": "admin"
  }
}
```

### Phase 3: Test Login (API Level)

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123"}'
```

**Expected Response:**
```json
{
  "id": "user-id",
  "name": "User Name from users table",
  "email": "admin@company.com",
  "role": "admin",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Save the token for testing other endpoints.**

### Phase 4: Test API Endpoints

Using the token from above, test these endpoints:

**1. Get Dashboard Stats**
```bash
curl -X GET http://localhost:3001/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: 
```json
{
  "total_employees": 150,
  "total_records": 1240,
  "daily_meal_count": 85,
  "recent_activity": [...]
}
```

**2. Get Tickets (Paginated)**
```bash
curl -X GET "http://localhost:3001/tickets?page=1&per_page=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**3. Get Employees**
```bash
curl -X GET "http://localhost:3001/employees?page=1&per_page=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**4. Get Attendance Chart Data**
```bash
curl -X GET "http://localhost:3001/dashboard/attendance?days=7" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**5. Get Ticket Chart Data**
```bash
curl -X GET "http://localhost:3001/dashboard/tickets?days=7" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Phase 5: Test Frontend Login

1. Open **http://localhost:3000** in browser
2. You should see a loading spinner briefly, then login page
3. Enter credentials:
   - **Email:** admin@company.com
   - **Password:** admin123
4. Click Login

**Expected:** Dashboard loads with data from PostgreSQL

### Phase 6: Verify Dashboard Data

Check these sections:
- [ ] Total Employees (from users table) shows correct count
- [ ] Total Records (from tickets table) shows correct count
- [ ] Daily Meal Count shows today's ticket count
- [ ] Charts populate with data
- [ ] Recent activity shows last 10 tickets

### Phase 7: Test Different Roles

Repeat Phase 5 with different users:

**HR User:**
- Email: hr@company.com
- Password: hr123
- Permissions: Dashboard, Employees, Tickets, Reports

**Canteen Rep:**
- Email: canteen@company.com
- Password: canteen123
- Permissions: Dashboard, Reports only

### Phase 8: Test Navigation

In Dashboard:
- [ ] Click "Employees" → Shows employee list from users table
- [ ] Click "Tickets" → Shows meal records from tickets table
- [ ] Click "Reports" → Shows analytics and charts
- [ ] Click "Settings" (Admin only) → Should be visible only for Admin
- [ ] Click "Audit Logs" (Admin/HR) → Shows activity logs

### Phase 9: Test Logout

- [ ] Click logout button
- [ ] Verify redirect to login page
- [ ] Verify token removed from browser localStorage

---

## 🧪 API Testing with Postman/Thunder Client

Create a Postman collection:

1. **Auth Collection:**
   - POST /auth/login
   - POST /auth/logout
   - GET /auth/verify
   - POST /auth/register

2. **Data Collection:**
   - GET /tickets
   - GET /employees
   - GET /dashboard/stats
   - GET /dashboard/attendance
   - GET /dashboard/tickets
   - GET /audit-logs

3. **Set Authorization:**
   - Type: Bearer Token
   - Token: (from login response)

---

## 🐛 Troubleshooting

### "Cannot load data" in dashboard
**Problem:** API errors in browser console

**Fixes:**
1. Check backend is running: `http://localhost:3001/health`
2. Check browser console (F12) for error details
3. Check backend terminal for error logs
4. Verify JWT token is valid

### "Invalid email or password"
**Problem:** Auth user doesn't exist

**Solutions:**
1. Create user via `/auth/register` endpoint (see Phase 2)
2. Verify user exists in auth_users table:
   ```sql
   SELECT email, role FROM auth_users;
   ```

### Dashboard stats are 0
**Problem:** No data in users or tickets tables OR incorrect table names

**Check:**
```sql
-- Should return employee counts
SELECT COUNT(*) FROM users;

-- Should return ticket counts
SELECT COUNT(*) FROM tickets;

-- List sample data
SELECT * FROM users LIMIT 5;
SELECT * FROM tickets LIMIT 5;
```

### Charts don't show data
**Problem:** `/dashboard/attendance` or `/dashboard/tickets` endpoints failing

**Check Backend Logs:**
- Look at Terminal 1 for error messages
- Verify PostgreSQL query syntax
- Check date formats in data

### CORS Error
**Problem:** "Access to XMLHttpRequest blocked by CORS"

**Solution:**
Backend is configured for `http://localhost:3000`. If frontend runs on different port, update in backend `src/index.ts`:
```javascript
cors({
  origin: 'http://localhost:YOUR_PORT',  // Change this
  credentials: true,
})
```

### "Authentication invalid" when clicking buttons
**Problem:** JWT token expired or invalid

**Solution:**
1. Logout and login again to get a fresh token
2. Check token expiry in `.env`: `JWT_EXPIRY=7d`

---

## 📊 Database Health Check

```sql
-- From any SQL client connected to PostgreSQL:

-- Check auth_users table
SELECT COUNT(*) FROM auth_users;
SELECT * FROM auth_users LIMIT 5;

-- Check users table (your employees)
SELECT COUNT(*) FROM users;
SELECT * FROM users LIMIT 5;

-- Check tickets table (meal records)
SELECT COUNT(*) FROM tickets;
SELECT * FROM tickets LIMIT 5;

-- Check audit_logs table
SELECT COUNT(*) FROM audit_logs;

-- Check table structures
\d auth_users;
\d users;
\d tickets;
```

---

## ✅ Success Criteria

Your system is working correctly when:

- [ ] Backend starts without database errors
- [ ] Frontend loads login page
- [ ] Can log in with test credentials
- [ ] Dashboard shows correct employee count
- [ ] Dashboard shows correct ticket count
- [ ] Employees page lists users from users table
- [ ] Tickets page lists records from tickets table
- [ ] Charts display attendance/ticket data
- [ ] Can switch between different user roles
- [ ] Logout clears token
- [ ] All API endpoints respond with data

---

## 🔄 Data Flow Summary

```
User Login (Frontend) 
  ↓
POST /auth/login (Backend)
  ↓
Verify credentials from auth_users table
  ↓
Generate JWT token
  ↓
Store token in localStorage (Frontend)
  ↓
All subsequent requests include JWT header
  ↓
Backend verifies token
  ↓ ✓ Valid
Fetch data from users/tickets tables
  ↓
Return JSON response
  ↓
Frontend displays data
```

---

## 📱 Next Steps After Successful Testing

1. **Add More Data** - Import employee records and ticket logs into PostgreSQL
2. **Refine Filtering** - Users can filter employees/tickets by various criteria
3. **Add Export** - Allow CSV/Excel export of reports
4. **Add Bulk Upload** - Import employees in bulk
5. **Production Setup** - Deploy to production server with secure JWT secret

---

## 📞 Quick Reference

| Component | Running On | Status Check |
|-----------|-----------|--------------|
| Backend | http://localhost:3001 | GET /health |
| Frontend | http://localhost:3000 | Browser loads |
| Database | 172.17.1.80:5432 | Connected if backend starts |
| Auth Endpoint | POST /auth/login | Test with curl |
| Dashboard API | GET /dashboard/stats | Requires JWT token |

---

**Everything set up? Run the full test flow above and let me know if you hit any issues!** 🚀
