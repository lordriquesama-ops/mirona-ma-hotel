# 🚀 Supabase Setup Guide for Mirona Hotel Management System

## 📋 Prerequisites

1. **Node.js and npm installed**
2. **Supabase account** (free at https://supabase.com)
3. **Your current project working**

## 🗝️ Step 1: Install Supabase Client

```bash
cd your-project-folder
npm install @supabase/supabase-js
```

## 🏗️ Step 2: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up/login
4. Click "New Project"
5. Choose your organization
6. Enter project details:
   - **Name**: `mirona-hotel`
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to your users
7. Click "Create new project"

## ⏱️ Step 3: Wait for Setup

Wait 1-2 minutes for Supabase to set up your project.

## 🔑 Step 4: Get Your Credentials

1. In your Supabase project dashboard:
   - Go to **Settings** → **API**
   - Copy the **Project URL** 
   - Copy the **anon public** key

## 🗃️ Step 5: Set Up Database Schema

1. In Supabase dashboard:
   - Go to **SQL Editor**
   - Click "New query"
   - Copy the entire contents of `supabase-schema.sql`
   - Paste and click "Run"

This will create all tables, indexes, RLS policies, and default data.

## 🔧 Step 6: Configure Environment

1. Create a `.env` file in your project root:
```bash
# Copy the example file
cp .env.example .env
```

2. Edit `.env` file with your Supabase credentials:
```env
# Replace with your actual Supabase values
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_USE_SUPABASE=true

# Keep as fallback
VITE_API_URL=http://localhost:3001/api
```

## 🎯 Step 7: Test the Integration

1. **Start your frontend**:
```bash
npm run dev
```

2. **Try logging in** with default credentials:
   - Username: `admin`
   - Password: `password123`

3. **Check browser console** for:
   - ✅ "✅ Booking saved to Supabase: xxx"
   - ✅ "✅ Room updated in Supabase: xxx"

## 🔄 Step 8: Real-time Features (Optional)

Your app now supports real-time updates! When you:
- Create a booking → All connected users see it instantly
- Update room status → Reception sees changes live
- Add charges → Management dashboard updates

## 🛠️ Step 9: Switch Between Backends

You can easily switch between backends:

### **Use Supabase** (Recommended):
```env
VITE_USE_SUPABASE=true
```

### **Use PostgreSQL Backend**:
```env
VITE_USE_SUPABASE=false
```

### **Use IndexedDB Only** (Offline):
```env
VITE_USE_SUPABASE=false
# And set USE_BACKEND=false in config.ts
```

## 🔍 Step 10: Verify Data in Supabase

1. Go to **Table Editor** in Supabase dashboard
2. Check:
   - `users` table should have 4 default users
   - `categories` table should have 4 categories
   - `bookings` table should show your test bookings
   - `rooms` table should be populated after seeding

## 🎉 Features You Now Have

### ✅ **Real-time Sync**
- Live updates across all devices
- No more refresh needed
- Instant booking status changes

### ✅ **Better Performance**
- Direct database connection
- No API bottleneck
- Faster data retrieval

### ✅ **Offline Support**
- Automatic fallback to IndexedDB
- Sync when connection restored
- No data loss

### ✅ **Enhanced Security**
- Row-level security policies
- Secure API keys
- User access control

### ✅ **Easy Maintenance**
- No backend server to manage
- Automatic backups
- Built-in monitoring

## 🚨 Troubleshooting

### **CORS Issues**
- Supabase handles CORS automatically
- No need to configure anything

### **Connection Issues**
- Check your `.env` file has correct URL/key
- Ensure VITE_USE_SUPABASE=true
- Check browser console for errors

### **Data Not Showing**
- Verify SQL schema was executed
- Check Table Editor for data
- Ensure RLS policies are working

### **Authentication Issues**
- Default users are pre-loaded
- Use `admin`/`password123` for testing
- Check `users` table in Supabase

## 📱 Mobile & Multi-device Support

Your app now works seamlessly across:
- 📱 Mobile phones
- 💻 Desktop computers  
- 🖥️ Tablets
- 🏢 Multiple reception desks

All devices stay in sync automatically!

## 🎯 Next Steps

1. **Test all features** with Supabase enabled
2. **Deploy to production** when ready
3. **Add real-time notifications** (built-in)
4. **Set up automated backups** (included)

**Congratulations! 🎉 Your hotel management system is now running on Supabase with real-time capabilities!**
