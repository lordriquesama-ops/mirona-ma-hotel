# 🚀 How to Run the Complete System

## Current Status

✅ **Frontend** - Already running on port 3004  
⏳ **Backend** - Installing dependencies (first-time setup)  
⏳ **PostgreSQL** - Needs to be installed and configured

---

## Quick Start Options

### Option 1: Using Batch Scripts (Easiest - Windows)

#### Step 1: Install PostgreSQL First!
1. Download from: https://www.postgresql.org/download/windows/
2. Install with default settings
3. **Remember your postgres password!**
4. Create database:
   ```sql
   -- Open pgAdmin or SQL Shell and run:
   CREATE DATABASE mirona_hotel;
   ```

#### Step 2: Configure Backend
1. Open `backend\.env` file
2. Update this line with your actual PostgreSQL password:
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/mirona_hotel?schema=public"
   ```
   Replace `YOUR_PASSWORD` with the password you set during PostgreSQL installation

#### Step 3: Run Backend
Double-click: `backend\start.bat`

OR open terminal and run:
```bash
cd backend
start.bat
```

The script will automatically:
- Install dependencies (first time only)
- Generate Prisma client
- Start the backend server

#### Step 4: Access Application
- Frontend: http://localhost:3004 (already running)
- Backend API: http://localhost:3001
- Login with: admin / password123

---

### Option 2: Manual Setup (More Control)

#### Terminal 1 - Backend Setup & Start:

```bash
# Navigate to backend folder
cd C:\Users\lordrique\Desktop\mcp\websiste\backend

# 1. Install dependencies (first time only, takes 2-5 minutes)
npm install

# 2. Configure database - Edit .env file
# Open backend\.env in text editor
# Change: DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/mirona_hotel?schema=public"

# 3. Generate Prisma Client
npm run db:generate

# 4. Run database migrations
npm run db:migrate

# 5. Seed database with sample data
npm run db:seed

# 6. Start backend server
npm run dev
```

Backend will start on: **http://localhost:3001**

#### Terminal 2 - Frontend (Already Running):

Your frontend is already running on port 3004. If you need to restart it:

```bash
# In a new terminal window
cd C:\Users\lordrique\Desktop\mcp\websiste
npm run dev
```

---

## 🔍 Verify Installation

### Check Backend is Running:
Open browser to: http://localhost:3001/health

You should see:
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": 123.456
}
```

### Check Frontend is Running:
Open browser to: http://localhost:3004

You should see the login page.

### Test Login:
- Username: `admin`
- Password: `password123`

---

## 📊 What You Should See

### Backend Console Output (when successfully started):
```
╔═══════════════════════════════════════════════╗
║     🏨 Mirona Ma Hotel Backend Server        ║
╠═══════════════════════════════════════════════╣
║  Running on: http://localhost:3001           ║
║  Environment: development                    ║
║                                               ║
║  API Endpoints:                              ║
║  - Auth: /api/auth                           ║
║  - Users: /api/users                         ║
║  - Bookings: /api/bookings                   ║
║  ... etc ...
╚═══════════════════════════════════════════════╝
```

### Frontend:
- Modern hotel management dashboard
- Login screen
- After login: Dashboard with rooms, bookings, guests, etc.

---

## 🐛 Troubleshooting

### "Cannot connect to database"
1. Make sure PostgreSQL is running:
   ```bash
   pg_ctl status
   ```
2. Verify database exists:
   ```sql
   \l  -- in psql or pgAdmin
   ```
3. Check `.env` file has correct password

### "npm install fails"
- Delete `node_modules` folder
- Delete `package-lock.json`
- Run `npm install` again

### "Port 3001 already in use"
- Stop any other service using port 3001
- Or edit `backend\.env` and change `PORT=3001` to another port

### Frontend shows blank page
1. Check browser console (F12) for errors
2. Make sure backend is running
3. Clear browser cache and reload

---

## 📋 Installation Checklist

Before running, ensure:

- [ ] PostgreSQL 14+ is installed and running
- [ ] Database `mirona_hotel` is created
- [ ] `backend\.env` has correct database URL with your password
- [ ] Node.js 18+ is installed (`node --version`)
- [ ] Backend dependencies installed (`npm install` completed)
- [ ] Prisma client generated (`npm run db:generate`)
- [ ] Migrations ran successfully (`npm run db:migrate`)
- [ ] Database seeded (`npm run db:seed`)

---

## 🎯 Daily Usage

Once everything is set up, daily startup is simple:

### Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

### Terminal 2 - Frontend (if needed):
```bash
npm run dev
```

### Access:
- Open: http://localhost:3004
- Login: admin / password123

---

## 📖 Additional Resources

- **Full Setup Guide:** [SETUP.md](SETUP.md)
- **Quick Reference:** [QUICKSTART.md](QUICKSTART.md)
- **API Documentation:** [backend/README.md](backend/README.md)
- **Installation Checklist:** [INSTALLATION_CHECKLIST.md](INSTALLATION_CHECKLIST.md)

---

## ✅ Success Indicators

You know everything is working when:

1. ✅ Backend terminal shows "Mirona Ma Hotel Backend Server" message
2. ✅ Frontend loads at http://localhost:3004
3. ✅ Can login with admin credentials
4. ✅ Dashboard displays room and booking data
5. ✅ No errors in browser console (F12)
6. ✅ No errors in backend terminal

---

## 🎉 Default Credentials

| Username   | Password      | Role       |
|------------|---------------|------------|
| admin      | password123   | ADMIN      |
| manager    | password123   | MANAGER    |
| reception  | password123   | RECEPTION  |
| marketing  | password123   | MARKETING  |

---

**Need Help?** Check the detailed guides mentioned above or review the error messages carefully.

Good luck! 🚀
