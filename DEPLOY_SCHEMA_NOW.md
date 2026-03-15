# 🚀 Deploy Database Schema - Quick Guide

## ⚠️ IMPORTANT: Your tables are empty!

The connection test shows that Supabase is connected, but your database tables don't have any data yet. You need to deploy the schema.

## 📋 Step-by-Step Instructions

### Step 1: Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Find your project: `wyelzqqqmrkwqtduqamf`
3. Click on it to open

### Step 2: Open SQL Editor
1. In the left sidebar, click **SQL Editor**
2. Click **New Query** button

### Step 3: Copy the Schema
1. Open the file: `websiste/supabase-schema.sql`
2. Copy ALL the contents (Ctrl+A, Ctrl+C)

### Step 4: Run the Schema
1. Paste into the SQL Editor (Ctrl+V)
2. Click **Run** button (or press Ctrl+Enter)
3. Wait for completion (should take 5-10 seconds)

### Step 5: Verify Success
Look for these messages:
- ✅ "Success. No rows returned"
- ✅ Tables created
- ✅ Default data inserted

### Step 6: Test Again
```bash
node test-supabase-connection.js
```

Expected results after schema deployment:
- ✅ Found 4 users
- ✅ Found 4 categories
- ✅ Found 1 settings record

## 🎯 What the Schema Does

### Creates Tables (10)
1. **users** - 4 default users (admin, manager, reception, marketing)
2. **categories** - 4 room types (Presidential, Suites, Deluxe, Safari)
3. **rooms** - Will be created by app
4. **bookings** - Empty, ready for use
5. **guests** - Empty, ready for use
6. **services** - Empty, ready for use
7. **expenses** - Empty, ready for use
8. **settings** - 1 default hotel configuration
9. **audit_logs** - Empty, ready for use
10. **shifts** - Empty, ready for use

### Sets Up Security
- Enables Row Level Security (RLS) on all tables
- Creates policies for authenticated users
- Configures proper access controls

### Adds Performance
- Creates indexes on frequently queried columns
- Sets up automatic timestamp updates
- Configures foreign key relationships

## 🔍 Verify in Dashboard

After running the schema, check:

1. **Table Editor** (left sidebar)
   - Click on `users` table → Should see 4 users
   - Click on `categories` table → Should see 4 categories
   - Click on `settings` table → Should see 1 record

2. **Database** → **Tables**
   - Should see all 10 tables listed

## 🚨 Troubleshooting

### Error: "relation already exists"
**Solution**: Tables already exist. You can either:
- Skip this step (tables are already there)
- Or drop tables first (dangerous - loses data!)

### Error: "permission denied"
**Solution**: 
- Make sure you're logged into the correct Supabase account
- Verify you have admin access to the project

### Error: "syntax error"
**Solution**:
- Make sure you copied the ENTIRE schema file
- Check that nothing was cut off at the beginning or end

## ✅ Success Indicators

After deployment, you should see:
- 4 users in the `users` table
- 4 categories in the `categories` table
- 1 record in the `settings` table
- All tables visible in Table Editor

## 🎉 Next Steps After Deployment

1. Run test again: `node test-supabase-connection.js`
2. Start the app: `npm run dev`
3. Login with: `admin` / `password123`
4. Create your first booking!

## 📞 Need Help?

If you encounter issues:
1. Check the Supabase logs (Dashboard → Logs)
2. Verify you're in the correct project
3. Make sure you have internet connection
4. Try refreshing the dashboard

---

**Quick Link**: https://supabase.com/dashboard/project/wyelzqqqmrkwqtduqamf/editor

**Schema File**: `websiste/supabase-schema.sql`

**Status**: ⚠️ PENDING - Deploy schema to continue
