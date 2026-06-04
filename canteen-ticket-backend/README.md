# CDK CanteenTrack Backend API

Node.js/Express backend server for CDK CanteenTrack Enterprise Management System.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database
Before running the server for the first time, create the `auth_users` table:
```bash
npm run setup-db
```

This will:
- Create `auth_users` table
- Create `audit_logs` table
- Create necessary indexes

### 3. Create Users (SQL)
Add auth users directly to database:
```sql
INSERT INTO auth_users (email, password, role, zk_user_id) VALUES 
('admin@company.com', '$2a$10/...', 'admin', 'admin_zk_id'),
('hr@company.com', '$2a$10/...', 'hr', 'hr_zk_id'),
('canteen@company.com', '$2a$10/...', 'canteen_rep', 'canteen_zk_id');
```

Use the `/register` endpoint to create users with plain passwords (they'll be hashed automatically):
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "admin123",
    "role": "admin",
    "zk_user_id": "001"
  }'
```

### 4. Run Development Server
```bash
npm run dev
```

Server will start on `http://localhost:3001`

### 5. Build for Production
```bash
npm run build
npm start
```

## API Endpoints

### Authentication

**POST /auth/login**
- Request: `{ "email": "string", "password": "string" }`
- Response: `{ "id", "name", "email", "role", "token" }`

**POST /auth/logout**
- Requires: Bearer token
- Response: `{ "message": "Logged out successfully" }`

**GET /auth/verify**
- Requires: Bearer token
- Response: User details with token

**POST /auth/register**
- Request: `{ "email", "password", "role", "zk_user_id" }`
- Response: Newly created user

### Data & Dashboard

**GET /tickets?page=1&per_page=20&search=&department=&zk_user_id=**
- Requires: Bearer token
- Returns: Paginated ticket logs with filtering

**GET /tickets/:ticket_number**
- Requires: Bearer token
- Returns: Single ticket details

**GET /dashboard/stats**
- Requires: Bearer token
- Returns: Dashboard statistics (employees, records, daily count)

**GET /dashboard/attendance?days=7**
- Requires: Bearer token
- Returns: Attendance chart data for last N days

**GET /dashboard/tickets?days=7**
- Requires: Bearer token
- Returns: Ticket chart data with amounts

**GET /audit-logs?page=1&per_page=20**
- Requires: Bearer token + Admin/HR role
- Returns: Paginated audit logs

## Environment Variables

See `.env` file:
```
DB_HOST=172.17.1.80
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=Pes123die@
DB_NAME=fingerprint_ticket_db
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRY=7d
```

## Database Schema

### auth_users
```sql
id UUID PRIMARY KEY
email VARCHAR(255) UNIQUE NOT NULL
password VARCHAR(255) NOT NULL
role VARCHAR(50) CHECK (role IN ('admin', 'hr', 'canteen_rep'))
zk_user_id VARCHAR(255)
created_at TIMESTAMP
updated_at TIMESTAMP
```

### Existing Tables (Must Already Exist)
- `users` (zk_user_id, name, department, position, amount)
- `tickets` (ticket_number, zk_user_id, event_name, event_date, printed_at, name, department, amount)

## Development

### Type Checking
```bash
npm run typecheck
```

### Project Structure
```
src/
├── config/
│   └── database.ts          # PostgreSQL connection
├── routes/
│   ├── auth.ts              # Authentication endpoints
│   └── data.ts              # Data/dashboard endpoints
├── middleware/
│   └── auth.ts              # JWT middleware
├── types/
│   └── index.ts             # TypeScript interfaces
├── utils/
│   ├── jwt.ts               # JWT token utilities
│   └── setupDatabase.ts     # Database initialization
└── index.ts                 # Main server file
```

## Testing Endpoints

Use Postman, Thunder Client, or curl:

```bash
# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123"}'

# Get tickets (replace TOKEN)
curl -X GET http://localhost:3001/tickets \
  -H "Authorization: Bearer TOKEN"

# Get dashboard stats
curl -X GET http://localhost:3001/dashboard/stats \
  -H "Authorization: Bearer TOKEN"
```

## Troubleshooting

**Cannot connect to database**
- Verify PostgreSQL is running on 172.17.1.80:5432
- Check .env credentials
- Ensure firewall allows connection

**Auth table doesn't exist**
- Run `npm run setup-db` to create it

**Token expired**
- Login again to get a new token
- Change JWT_EXPIRY in .env if needed

**CORS errors in frontend**
- Check frontend API URL matches CORS origin (http://localhost:3000)

## License

MIT
