# Supabase Setup Checklist

## ✅ Pre-Setup Verification

### 1. Supabase Project
- [ ] Supabase project created at https://supabase.com
- [ ] Project URL: `https://wyelzqqqmrkwqtduqamf.supabase.co`
- [ ] Anon key obtained from project settings

### 2. Database Schema
- [ ] Run `websiste/supabase-schema.sql` in Supabase SQL Editor
- [ ] Verify all tables created (10 tables total)
- [ ] Verify default data inserted (users, categories, settings)
- [ ] Verify RLS policies enabled

### 3. Local Environment
- [ ] `.env` file exists in `websiste/` folder
- [ ] `VITE_SUPABASE_URL` set correctly
- [ ] `VITE_SUPABASE_ANON_KEY` set correctly
- [ ] `VITE_USE_SUPABASE=true` set
- [ ] Dependencies installed (`npm install`)

## 🔧 Configuration Files

### Required Files (All Present ✅)
- [x] `websiste/.env` - Environment variables
- [x] `websiste/services/supabase.ts` - Supabase client
- [x] `websiste/services/supabase-adapter.ts` - Data adapter
- [x] `websiste/services/db.ts` - Database service
- [x] `websiste/services/config.ts` - Configuration
- [x] `websiste/force-supabase.ts` - Force enable flag
- [x] `websiste/supabase-schema.sql` - Database schema

## 🧪 Testing Steps

### Step 1: Verify Environment
```bash
cd websiste
cat .env
```
Expected output should show:
```
VITE_SUPABASE_URL=https://wyelzqqqmrkwqtduqamf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_USE_SUPABASE=true
```

### Step 2: Run Connection Test
```bash
node test-supabase-connection.js
```
Expected: All 10 tests should pass ✅

### Step 3: Run Verification Script
```bash
verify-supabase.bat
```
Expected: All checks should pass ✅

### Step 4: Start Development Server
```bash
npm run dev
```
Expected: App starts without errors

### Step 5: Test Login
1. Open app in browser
2. Login with:
   - Username: `admin`
   - Password: `password123`
3. Expected: Successfully logged in

### Step 6: Test Data Operations
1. Navigate to Bookings
2. Create a test booking
3. Verify it appears in the list
4. Check Supabase dashboard to confirm data saved

## 🔍 Troubleshooting

### Issue: "Failed to fetch" error
**Solution**: 
- Check internet connection
- Verify Supabase URL is correct
- Check if Supabase project is active

### Issue: "Row Level Security" error
**Solution**:
- Verify RLS policies are created
- Check if using `supabaseAdmin` client for operations
- Ensure schema SQL was run completely

### Issue: "Table does not exist" error
**Solution**:
- Run `supabase-schema.sql` in Supabase SQL Editor
- Verify all tables created in Supabase dashboard
- Check for SQL execution errors

### Issue: "Invalid API key" error
**Solution**:
- Verify `VITE_SUPABASE_ANON_KEY` in `.env`
- Get fresh key from Supabase project settings
- Restart dev server after changing `.env`

### Issue: Login fails
**Solution**:
- Verify users table has data
- Check default password is `password123`
- Look at browser console for errors

## 📊 Expected Database State

### Users Table (4 users)
- admin / Sarah Jenkins / ADMIN
- manager / David Okello / MANAGER
- reception / Grace Nakato / RECEPTION
- marketing / Alex Muli / MARKETING

### Categories Table (4 categories)
- Presidential (A) - 8 rooms - 50,000 UGX
- Suites (B) - 12 rooms - 30,000 UGX
- Deluxe (C) - 10 rooms - 20,000 UGX
- Safari (D) - 8 rooms - 10,000 UGX

### Settings Table (1 record)
- Hotel Name: Mirona Hotel
- Currency: UGX
- Tax Rate: 18%

## 🎯 Success Criteria

All of the following should be true:
- [x] Environment variables configured
- [x] Supabase package installed
- [x] Configuration files present
- [x] Database schema deployed
- [ ] Connection test passes (10/10)
- [ ] App starts without errors
- [ ] Login works
- [ ] Data operations work (CRUD)
- [ ] No console errors

## 🚀 Next Steps After Setup

1. **Test all features**:
   - Bookings management
   - Room status updates
   - Guest profiles
   - Financial tracking

2. **Configure real-time updates**:
   - Test live booking updates
   - Test room status changes

3. **Security hardening**:
   - Change default passwords
   - Review RLS policies
   - Add service role key if needed

4. **Performance optimization**:
   - Monitor query performance
   - Add indexes if needed
   - Configure connection pooling

## 📞 Support

If you encounter issues:
1. Check the diagnostic report: `SUPABASE_DIAGNOSTIC_REPORT.md`
2. Review Supabase logs in dashboard
3. Check browser console for errors
4. Verify network requests in DevTools

## ✨ Current Status

Based on code analysis:
- ✅ Configuration: **COMPLETE**
- ✅ Integration: **COMPLETE**
- ✅ Code Quality: **GOOD**
- ⚠️ Testing: **PENDING** (run test script)
- ⚠️ Schema Deployment: **VERIFY** (check Supabase dashboard)

**Overall**: Ready for testing! Run the verification script to confirm everything works.
