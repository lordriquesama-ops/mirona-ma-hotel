# 🔍 Booking Not Saving to PostgreSQL - Diagnostic Guide

## 🚨 **Problem Identified**

You created a booking in the frontend, but it's NOT appearing in the PostgreSQL database!

---

## 📋 **Step-by-Step Diagnosis**

### **Step 1: Check Browser Console (MOST IMPORTANT!)**

Press **F12** to open DevTools, then go to **Console** tab and look for these messages when you save a booking:

#### ✅ **Success Message (Working):**
```
✅ Booking saved to PostgreSQL: abc-123-def
```

#### ❌ **Error Messages (Not Working):**
```
❌ Direct API sync failed, queuing for later: [error message]
Failed to fetch
NetworkError when attempting to fetch resource
Cannot read property 'post' of undefined
```

**What to do:**
- Copy ANY red error messages you see
- Tell me the exact error text

---

### **Step 2: Check Network Tab**

In DevTools (F12), click **Network** tab:

1. **Clear** the network log (trash icon)
2. **Create a new booking** in your app
3. **Watch for requests** starting with `bookings`

#### ✅ **If You See This:**
```
POST http://localhost:3001/api/bookings
Status: 200 OK or 201 Created
```
→ **API call is working!** Problem might be in backend validation

#### ❌ **If You See This:**
```
POST http://localhost:3001/api/bookings
Status: (failed) or 401 or 403 or 500
```
→ **API call is failing!** Here's why:

| Status | Meaning | Fix |
|--------|---------|-----|
| **(failed)** | CORS or network error | Check backend is running |
| **401 Unauthorized** | Missing/invalid token | Login again |
| **403 Forbidden** | Wrong permissions | Check user role |
| **500 Server Error** | Backend crashed | Check backend terminal |

---

### **Step 3: Verify Backend is Receiving Requests**

Check your backend terminal (where you see the hotel server message):

#### ✅ **Should See:**
```
2026-03-05T22:00:00.000Z - POST /api/bookings
```

#### ❌ **If You See NOTHING:**
→ Request never reached backend! Problem is in frontend/network

---

### **Step 4: Check Authentication Token**

The API requires JWT authentication. Let's verify you have a valid token:

**In Browser Console (F12 → Console), type:**
```javascript
sessionStorage.getItem('mirona_auth_token')
```

#### ✅ **Should Return:**
```
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6..."
```
(Long string = valid token)

#### ❌ **Returns `null`:**
→ **No token!** You need to login again

**Fix:**
1. Logout
2. Login again with admin/password123
3. Try creating booking

---

### **Step 5: Test API Manually**

Open browser console and run this test:

```javascript
// Test if backend is reachable
fetch('http://localhost:3001/health')
  .then(r => r.json())
  .then(d => console.log('Backend status:', d))
  .catch(e => console.error('Backend unreachable:', e));
```

#### ✅ **Should Log:**
```
Backend status: {status: "ok", timestamp: "...", uptime: 123}
```

#### ❌ **Logs Error:**
```
Backend unreachable: TypeError: Failed to fetch
```
→ **Backend not running!** Start it with:
```bash
cd backend
npm run dev
```

---

## 🎯 **Common Issues & Solutions**

### **Issue 1: No Authentication Token**

**Symptoms:**
- Network shows 401 Unauthorized
- Console shows "Unauthorized" error
- `sessionStorage.getItem('mirona_auth_token')` returns null

**Solution:**
```javascript
// In browser console, manually set a test token
// Then try creating booking again
```

**Better Solution:**
1. Logout from the app
2. Login again with credentials
3. Token will be saved automatically

---

### **Issue 2: CORS Policy Blocking**

**Symptoms:**
- Console shows: "Access to fetch at ... has been blocked by CORS policy"
- Network shows status "(failed)"
- Backend logs show no requests

**Solution:**
Backend already has CORS configured, but let's verify:

Check `backend/src/server.ts` line ~29:
```typescript
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));
```

Your frontend is on `http://localhost:3000` which should work!

**Quick Fix:**
Try accessing from different browser or incognito mode

---

### **Issue 3: Backend Validation Errors**

**Symptoms:**
- Network shows POST request
- Status 400 Bad Request
- Response body has validation errors

**Solution:**
Check Network tab response for details. Common issues:
- Missing required fields (guestName, phone, roomId, etc.)
- Wrong data types (amount must be number, not string)
- Invalid dates (checkInDate must be valid date string)

---

### **Issue 4: Database Connection Issues**

**Symptoms:**
- Backend terminal shows Prisma errors
- "Can't reach database server"
- Booking creation fails with 500 error

**Solution:**
```bash
cd backend
npx prisma db pull
```

Verify PostgreSQL is running:
```bash
# Windows Services → Look for "PostgreSQL"
# Or run:
psql -U postgres -l
```

---

## 🔧 **Manual Test Script**

Run this in your browser console to test the entire flow:

```javascript
// 1. Get auth token
const token = sessionStorage.getItem('mirona_auth_token');
console.log('Token:', token ? '✅ Present' : '❌ Missing');

// 2. Test booking creation
const testBooking = {
  guestName: 'Test User',
  phone: '+256700000000',
  email: 'test@example.com',
  roomId: 'A1', // Presidential Suite
  checkInDate: new Date().toISOString(),
  checkOutDate: new Date(Date.now() + 86400000 * 3).toISOString(), // +3 days
  adults: 2,
  children: 0,
  guests: 2,
  amount: 150000,
  paidAmount: 50000,
  paymentMethod: 'Cash',
  status: 'CONFIRMED',
  notes: 'Test booking from console'
};

// 3. Send to API
fetch('http://localhost:3001/api/bookings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(testBooking)
})
.then(r => {
  console.log('Status:', r.status);
  return r.json();
})
.then(d => {
  if (d.id) {
    console.log('✅ SUCCESS! Booking ID:', d.id);
  } else {
    console.error('❌ FAILED:', d);
  }
})
.catch(e => console.error('❌ ERROR:', e));
```

**Expected Output:**
```
Token: ✅ Present
Status: 201
✅ SUCCESS! Booking ID: abc-123-def
```

---

## 📊 **Verification Checklist**

Go through these steps and tell me which ones pass/fail:

- [ ] **Step 1:** Browser console shows "✅ Booking saved to PostgreSQL"
- [ ] **Step 2:** Network tab shows POST to `/api/bookings` with status 200/201
- [ ] **Step 3:** Backend terminal shows `POST /api/bookings`
- [ ] **Step 4:** `sessionStorage.getItem('mirona_auth_token')` returns long string
- [ ] **Step 5:** Health check returns `{status: "ok"}`
- [ ] **Step 6:** Manual test script creates booking successfully

---

## 🎯 **Most Likely Culprit**

Based on typical issues, here's what's probably happening:

### **Probability Breakdown:**

| Issue | Probability | How to Check |
|-------|-------------|--------------|
| **Missing Token** | 60% | `sessionStorage.getItem('mirona_auth_token')` = null |
| **Backend Not Running** | 20% | Can't reach http://localhost:3001 |
| **CORS Block** | 10% | Console shows CORS error |
| **Validation Error** | 7% | Network shows 400 Bad Request |
| **Database Down** | 3% | Backend shows Prisma errors |

---

## ⚡ **Quick Fixes to Try NOW**

### **Fix #1: Re-login**
1. Click Logout in the app
2. Close browser completely
3. Open browser again
4. Go to http://localhost:3000
5. Login: admin / password123
6. Try creating booking

### **Fix #2: Restart Backend**
```bash
cd backend
# Press Ctrl+C to stop
npm run dev
```

### **Fix #3: Clear Browser Cache**
1. Press Ctrl+Shift+Delete
2. Select "Cached images and files"
3. Click "Clear data"
4. Refresh page (F5)

---

## 📝 **What to Report Back**

Please provide:

1. **Browser Console Errors** - Copy any red error messages
2. **Network Tab Status** - What status code for POST /api/bookings?
3. **Token Status** - Does `sessionStorage.getItem('mirona_auth_token')` return a value?
4. **Backend Logs** - Does backend terminal show the POST request?
5. **Manual Test Result** - Did the console test script work?

With this info, I can pinpoint the exact issue! 🔍

---

## ✅ **Expected Behavior (When Working)**

When everything works correctly, you should see:

```
[F12 Console]
✅ Booking saved to PostgreSQL: booking-abc-123

[Network Tab]
POST http://localhost:3001/api/bookings
Status: 201 Created
Payload: {guestName: "John", phone: "+256...", ...}
Response: {id: "booking-abc-123", ...}

[Backend Terminal]
2026-03-05T22:00:00.000Z - POST /api/bookings

[Prisma Studio]
Booking table shows new entry with ID "booking-abc-123"
```

---

**Next Step:** Run through the diagnostic steps above and share what you find! 🕵️‍♂️
