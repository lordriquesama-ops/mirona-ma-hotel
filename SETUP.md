# Mirona Ma Hotel - Complete Setup Guide

## 🎯 Overview

This project consists of:
1. **Frontend** - React + Vite + TypeScript (runs on port 3004)
2. **Backend** - Node.js + Express + PostgreSQL (runs on port 3001)
3. **Database** - PostgreSQL with Prisma ORM

## 📋 Prerequisites

Before starting, ensure you have:

- **Node.js 18+** - [Download](https://nodejs.org/)
- **PostgreSQL 14+** - [Download](https://www.postgresql.org/download/)
- **Git** (optional) - For version control

## 🚀 Quick Start

### Step 1: Install PostgreSQL

#### Windows:
1. Download from [PostgreSQL website](https://www.postgresql.org/download/windows/)
2. Run installer and follow the wizard
3. Remember your postgres password!
4. Default port: 5432

#### Verify PostgreSQL is running:
```bash
# Check if PostgreSQL service is running
pg_ctl status

# Or check via psql
psql -U postgres -l
```

### Step 2: Create Database

Open pgAdmin or command line:

```sql
CREATE DATABASE mirona_hotel;
```

### Step 3: Set Up Backend

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Update database credentials in .env file
# Edit this line with your postgres password:
# DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/mirona_hotel?schema=public"

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed

# Start backend server
npm run dev
```

Backend will start on: **http://localhost:3001**

### Step 4: Frontend is Already Running!

Your frontend is already running on port 3004. It's now configured to connect to the backend automatically.

If you need to restart it:
```bash
# In a new terminal window
npm run dev
```

## 🔐 Default Login Credentials

After running the seed command, you can log in with:

| Username   | Password      | Role       | Name              |
|------------|---------------|------------|-------------------|
| admin      | password123   | ADMIN      | Sarah Jenkins     |
| manager    | password123   | MANAGER    | David Okello      |
| reception  | password123   | RECEPTION  | Grace Nakato      |
| marketing  | password123   | MARKETING  | Alex Muli         |

## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Frontend  │ ◄──► │   Backend    │ ◄──► │ PostgreSQL  │
│  (Port 3004)│      │  (Port 3001) │      │  (Port 5432)│
│  React/Vite │      │ Express/Prisma│     │  Database   │
└─────────────┘      └──────────────┘      └─────────────┘
```

## 📁 Project Structure

```
websiste/
├── backend/                 # Backend API
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   ├── src/
│   │   ├── db/             # Database connection & seed
│   │   ├── middleware/     # Auth middleware
│   │   ├── routes/         # API routes
│   │   └── server.ts       # Main server file
│   ├── .env                # Environment variables
│   └── package.json
├── components/              # React components
├── services/                # API & DB services
│   ├── api.ts              # API client
│   ├── config.ts           # Configuration
│   └── db.ts               # IndexedDB (fallback)
├── App.tsx                  # Main app component
└── package.json
```

## 🔧 Configuration

### Backend (.env)

Edit `backend/.env`:

```env
PORT=3001
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/mirona_hotel?schema=public"
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### Frontend (services/config.ts)

Already configured:
- `USE_BACKEND = true` - Uses backend API
- `API_BASE_URL = 'http://localhost:3001/api'`

## 🎮 Usage

### Starting Both Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### Accessing the Application

Open your browser to: **http://localhost:3004** (or use the preview button)

## 🛠️ Development Commands

### Backend

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio (database GUI)
```

### Frontend

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

## 🐛 Troubleshooting

### Backend won't start

**Error: Cannot connect to database**
1. Check PostgreSQL is running: `pg_ctl status`
2. Verify database exists: `psql -U postgres -l`
3. Check credentials in `backend/.env`
4. Ensure PostgreSQL port 5432 is not blocked

**Error: Module not found**
```bash
cd backend
npm install
```

### Frontend issues

**Error: TransactionInactiveError**
- Already fixed in the code! This was an IndexedDB issue that's now resolved by using the backend.

**Port already in use**
- The app will automatically use the next available port (3004, 3005, etc.)

### Database issues

**Reset database completely:**
```bash
cd backend
npx prisma migrate reset
npm run db:seed
```

**View database:**
```bash
npm run db:studio
```
Opens at: http://localhost:5555

## 📊 Testing the API

Test with curl or Postman:

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'

# Get bookings (use token from login)
curl http://localhost:3001/api/bookings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Health check
curl http://localhost:3001/health
```

## 🔒 Security Notes

⚠️ **Before deploying to production:**

1. Change JWT_SECRET in `backend/.env`
2. Use strong passwords for all users
3. Enable HTTPS
4. Set proper CORS origins
5. Add rate limiting
6. Use environment variables for sensitive data

## 📈 Next Steps

1. ✅ Backend is set up and running
2. ✅ Frontend is connected to backend
3. ✅ Database is seeded with sample data
4. 🎯 Start using the hotel management system!

## 💡 Tips

- **IndexedDB vs Backend**: The app now uses PostgreSQL backend. IndexedDB remains as fallback.
- **Offline Support**: The app still works offline with IndexedDB when backend is unavailable.
- **Data Sync**: When backend is available, data syncs automatically.
- **Multiple Users**: Test different roles (admin, manager, reception) to see role-based features.

## 🆘 Need Help?

Common issues and solutions:

1. **"Cannot connect to PostgreSQL"**
   - Check PostgreSQL service is running
   - Verify username/password in .env
   - Ensure database 'mirona_hotel' exists

2. **"npm install fails"**
   - Delete node_modules and package-lock.json
   - Run `npm install` again

3. **"Frontend shows blank page"**
   - Check browser console for errors
   - Ensure both backend and frontend are running
   - Clear browser cache

## 🎉 Success!

You should now have:
- ✅ PostgreSQL database running
- ✅ Backend API on port 3001
- ✅ Frontend app on port 3004
- ✅ Sample data seeded
- ✅ Full hotel management system ready to use!

Login with any of the default credentials and start managing your hotel! 🏨
