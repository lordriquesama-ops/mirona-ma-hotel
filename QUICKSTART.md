# 🚀 Quick Start Guide

## For First-Time Setup

### Option 1: Automated Setup (Windows)

Double-click `backend\setup.bat` and follow the prompts.

### Option 2: Manual Setup

#### 1. Install PostgreSQL
- Download from: https://www.postgresql.org/download/
- Install and remember your postgres password
- Create database:
  ```sql
  CREATE DATABASE mirona_hotel;
  ```

#### 2. Set Up Backend
```bash
cd backend
npm install
```

Edit `backend\.env` with your PostgreSQL password:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/mirona_hotel?schema=public"
```

Then run:
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

#### 3. Start Backend
```bash
cd backend
npm run dev
```
Backend runs on: **http://localhost:3001**

#### 4. Frontend (Already Running!)
Your frontend is already running on port 3004 and configured to use the backend.

---

## 🎯 Daily Usage

### Terminal 1 - Start Backend:
```bash
cd backend
npm run dev
```

### Terminal 2 - Start Frontend (if not running):
```bash
npm run dev
```

### Access Application:
Open browser to: **http://localhost:3004**

---

## 🔐 Default Login

- **Username:** admin
- **Password:** password123

Other users:
- manager / password123
- reception / password123  
- marketing / password123

---

## 📊 Database Tools

View/edit database in browser:
```bash
cd backend
npm run db:studio
```
Opens at: http://localhost:5555

---

## ❓ Common Issues

**Can't connect to database?**
- Check PostgreSQL is running: `pg_ctl status`
- Verify credentials in `backend\.env`

**Frontend errors?**
- Make sure backend is running on port 3001
- Check browser console for errors

**Need to reset database?**
```bash
cd backend
npx prisma migrate reset
npm run db:seed
```

---

## 📖 Full Documentation

See [SETUP.md](SETUP.md) for detailed setup instructions.
See [backend/README.md](backend/README.md) for API documentation.

---

## ✅ Success Checklist

- [ ] PostgreSQL installed and running
- [ ] Database 'mirona_hotel' created
- [ ] Backend dependencies installed
- [ ] `.env` configured with correct password
- [ ] Migrations run successfully
- [ ] Database seeded
- [ ] Backend running on port 3001
- [ ] Frontend running on port 3004
- [ ] Can login with admin credentials

🎉 You're ready to go!
