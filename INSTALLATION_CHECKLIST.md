# Backend Installation Checklist ✅

Use this checklist to ensure proper setup of the backend.

## Prerequisites

- [ ] Node.js 18+ installed (`node --version`)
- [ ] PostgreSQL 14+ installed
- [ ] PostgreSQL service is running
- [ ] You know your PostgreSQL password

## Database Setup

- [ ] Created database: `CREATE DATABASE mirona_hotel;`
- [ ] Verified database exists: `\l` in psql

## Backend Installation

- [ ] Navigated to `backend` folder
- [ ] Ran `npm install` successfully
- [ ] No errors during installation

## Configuration

- [ ] Opened `backend\.env` file
- [ ] Updated `DATABASE_URL` with correct password:
  ```
  DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/mirona_hotel?schema=public"
  ```
- [ ] Saved the `.env` file

## Database Initialization

- [ ] Generated Prisma Client: `npm run db:generate`
- [ ] Ran migrations: `npm run db:migrate`
- [ ] Seeded database: `npm run db:seed`
- [ ] Saw success messages for:
  - [ ] Users created (4 users)
  - [ ] Categories created (4 categories)
  - [ ] Rooms created (38 rooms)
  - [ ] Services created (6 services)
  - [ ] Settings created
  - [ ] Website content created

## Server Startup

- [ ] Started backend server: `npm run dev`
- [ ] Server started without errors
- [ ] Server shows it's running on http://localhost:3001
- [ ] Can see API endpoints list

## Frontend Connection

- [ ] Frontend is running (port 3004 or similar)
- [ ] Frontend configured to use backend (`USE_BACKEND = true`)
- [ ] Can access application in browser

## Testing

- [ ] Opened browser to http://localhost:3004
- [ ] Login page appears
- [ ] Logged in with: admin / password123
- [ ] Dashboard loads successfully
- [ ] Can see rooms/bookings data

## Verification Tests

### Test 1: Health Check
- [ ] Opened http://localhost:3001/health in browser
- [ ] Saw response: `{"status":"ok",...}`

### Test 2: API Root
- [ ] Opened http://localhost:3001/ in browser
- [ ] Saw API information with endpoints list

### Test 3: Login API
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```
- [ ] Received token and user data in response

### Test 4: Get Bookings (with token)
```bash
curl http://localhost:3001/api/bookings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```
- [ ] Received bookings array (may be empty)

## Database Tools

- [ ] Opened Prisma Studio: `npm run db:studio`
- [ ] Accessed http://localhost:5555
- [ ] Can view all database tables
- [ ] Can see seeded data (users, rooms, etc.)

## Troubleshooting Completed

If any issues occurred:

### PostgreSQL Connection Error
- [ ] Verified PostgreSQL is running: `pg_ctl status`
- [ ] Checked database exists: `psql -U postgres -l`
- [ ] Confirmed password in `.env` is correct
- [ ] Tested connection: `psql -U postgres -d mirona_hotel`

### npm install Errors
- [ ] Deleted `node_modules` folder
- [ ] Deleted `package-lock.json`
- [ ] Re-ran `npm install`

### Migration Errors
- [ ] Verified database connection works
- [ ] Checked PostgreSQL version (needs 14+)
- [ ] Tried reset: `npx prisma migrate reset`
- [ ] Re-ran: `npm run db:migrate`

### Port Already in Use
- [ ] Backend automatically switched to next port
- [ ] Noted the actual port number from console
- [ ] Updated frontend config if needed

## Final Verification

- [ ] Backend server running on port 3001
- [ ] Frontend running on port 3004 (or auto-assigned)
- [ ] Can log in to application
- [ ] Can navigate through different sections
- [ ] Data persists after page refresh
- [ ] No console errors in browser
- [ ] No errors in backend terminal

## Success! 🎉

All items checked above means your backend is fully operational!

---

## Next Steps

1. **Explore the Application**
   - [ ] Create a test booking
   - [ ] Add a guest
   - [ ] View rooms
   - [ ] Check expenses

2. **Learn the System**
   - [ ] Read [backend/README.md](backend/README.md) for API details
   - [ ] Review [SETUP.md](SETUP.md) for advanced configuration
   - [ ] Check [QUICKSTART.md](QUICKSTART.md) for daily usage

3. **Customize (Optional)**
   - [ ] Change default passwords
   - [ ] Update hotel information in settings
   - [ ] Modify room categories/prices
   - [ ] Add custom services

4. **Production Prep (Future)**
   - [ ] Change JWT_SECRET in `.env`
   - [ ] Set up production database
   - [ ] Configure HTTPS
   - [ ] Add monitoring/logging

---

## Daily Usage

When starting work each day:

```bash
# Terminal 1 - Start Backend
cd backend
npm run dev

# Terminal 2 - Start Frontend (if not running)
npm run dev
```

Then open: http://localhost:3004

---

**Checklist Version:** 1.0  
**Last Updated:** 2026-03-05
