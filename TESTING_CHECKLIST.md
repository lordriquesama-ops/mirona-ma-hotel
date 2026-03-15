# 🧪 System Testing Checklist

## ✅ Current Status

**Backend Server:** ✅ Running on http://localhost:3001  
**Frontend Server:** ✅ Running on http://localhost:3000  
**Prisma Client:** ✅ Generated successfully  
**Database:** ✅ Connected to PostgreSQL  

---

## 🎯 Quick Access

### Frontend Application
- **URL:** http://localhost:3000
- **Status:** Running with Vite
- **Click the preview button** in your IDE to open

### Backend API
- **URL:** http://localhost:3001
- **Health Check:** http://localhost:3001/health
- **API Root:** http://localhost:3001/

---

## 📋 Testing Checklist

### Phase 1: Authentication & Login

#### Test 1.1: Login Page Loads
- [ ] Open http://localhost:3000
- [ ] Login page appears
- [ ] No console errors (F12 → Console)
- [ ] Form fields are visible

#### Test 1.2: Login with Admin Credentials
- Username: `admin`
- Password: `password123`
- [ ] Click "Sign In"
- [ ] Dashboard loads successfully
- [ ] No error messages
- [ ] User info shows "Sarah Jenkins" or "Admin"

#### Test 1.3: Token Storage
- Open DevTools (F12)
- Go to Application tab
- Check sessionStorage
- [ ] `mirona_auth_token` exists
- [ ] Token is a long string (JWT)

---

### Phase 2: Dashboard & Navigation

#### Test 2.1: Dashboard Displays
- [ ] KPI cards show numbers (not zeros)
- [ ] Room status chart renders
- [ ] Recent bookings list appears
- [ ] No TypeScript/console errors

#### Test 2.2: Sidebar Navigation
Click each menu item and verify:
- [ ] Dashboard
- [ ] Bookings
- [ ] Rooms
- [ ] Guests
- [ ] Staff
- [ ] Finances
- [ ] Reports
- [ ] Settings

Each should:
- Load without errors
- Show appropriate content
- URL changes correctly

---

### Phase 3: Bookings Management

#### Test 3.1: View Bookings List
- Navigate to Bookings
- [ ] List of existing bookings appears
- [ ] Search bar works
- [ ] Filter by status works
- [ ] Pagination shows (if >50 bookings)

#### Test 3.2: Create New Booking
Click "+ New Booking" and fill form:
- Guest Name: `Test Guest`
- Phone: `+256700000000`
- Email: `test@example.com`
- Room Category: Any (e.g., Presidential)
- Room Number: Select one
- Check-in: Today's date
- Check-out: +3 days
- Adults: 2
- Status: CONFIRMED
- Payment Method: Cash

- [ ] Click "Create Booking"
- [ ] Success notification appears
- [ ] Booking appears in list
- [ ] Room status changes to RESERVED/OCCUPIED

#### Test 3.3: Add Services to Booking
- Find the booking you just created
- Click on it / Actions menu
- Look for "Add Services" option
- [ ] Services modal opens
- [ ] Can select services (Soda, Breakfast, etc.)
- [ ] Charges appear in booking
- [ ] Total amount updates

#### Test 3.4: Check-In Guest
- Find a CONFIRMED booking
- Click "Check In" or similar action
- [ ] Room status changes to OCCUPIED
- [ ] Booking status changes to CHECKED_IN
- [ ] Success message appears

#### Test 3.5: Check-Out Guest
- Find a CHECKED_IN booking
- Click "Check Out"
- [ ] Shows consumption summary
- [ ] Calculates total charges
- [ ] Shows remaining balance
- [ ] Can complete checkout
- [ ] Room status returns to AVAILABLE

---

### Phase 4: Rooms Management

#### Test 4.1: View Rooms
- Navigate to Rooms
- [ ] All rooms display (38 total)
- [ ] Categorized by type
- [ ] Color-coded by status
- [ ] Room images render

#### Test 4.2: Filter Rooms
- [ ] Filter by "All" shows all rooms
- [ ] Filter by category (Presidential, Suites, etc.) works
- [ ] Filter by status (Available, Occupied) works
- [ ] Search by room number works

#### Test 4.3: Change Room Status
- Click on any Available room
- Change status to "Cleaning"
- [ ] Status updates immediately
- [ ] Color changes (blue for Cleaning)
- [ ] Backend saves successfully

#### Test 4.4: Add New Room (If Admin)
- Click "+ Add Room" or similar
- Fill form:
  - Name: `TestRoom`
  - Category: Select any
  - Price: 50000
  - Floor: 1
- [ ] Room created successfully
- [ ] Appears in room list
- [ ] Can be booked

---

### Phase 5: Guest Management (CRM)

#### Test 5.1: View Guests
- Navigate to Guests
- [ ] Guest list appears
- [ ] Shows name, phone, visits, total spent
- [ ] VIP badge shows for high-spenders

#### Test 5.2: Guest Auto-Creation
- Create a booking with new phone number
- Go to Guests section
- [ ] New guest profile created automatically
- [ ] Visit count = 1
- [ ] Total spent = booking amount

#### Test 5.3: Guest Profile Details
- Click on any guest
- [ ] Shows full profile
- [ ] Booking history visible
- [ ] Total spending calculated
- [ ] VIP status correct (>1M = VIP)

---

### Phase 6: Financial Features

#### Test 6.1: Tax Calculation
- Create a booking with amount 100,000 UGX
- System settings should have tax rate (default 0%)
- Update tax rate to 18% in Settings
- [ ] Tax breakdown shows:
  - Subtotal: 100,000
  - Tax (18%): 18,000
  - Grand Total: 118,000

#### Test 6.2: Consumption Tracking
- Check in a guest for 5 days
- Wait/create scenario where today is day 3
- [ ] Shows "Days Stayed: 3"
- [ ] Shows "Daily Rate"
- [ ] Shows "Consumed Amount"
- [ ] Shows "Remaining Balance"

#### Test 6.3: Room Cost vs Services
- Create booking with:
  - Total: 150,000
  - Services: 30,000
- [ ] Room cost shows: 120,000
- [ ] Services separated in breakdown

---

### Phase 7: Expenses Tracking

#### Test 7.1: Record Expense
- Navigate to Finances → Expenses
- Click "+ Add Expense"
- Fill form:
  - Category: Utilities
  - Type: OPERATIONAL
  - Amount: 50,000
  - Date: Today
  - Description: "Electricity bill"
- [ ] Expense saved
- [ ] Appears in expense list
- [ ] Recorded by shows your username

#### Test 7.2: Expense Categories
- [ ] Can filter by category
- [ ] Total shows sum of expenses
- [ ] Date filtering works

---

### Phase 8: Services & Stock

#### Test 8.1: View Services
- Navigate to Services
- [ ] All 6 services listed
- [ ] Shows stock levels (for tracked items)
- [ ] Categories visible

#### Test 8.2: Stock Tracking
- Soda has stock: 100
- Add soda to a booking (qty: 2)
- [ ] Stock decreases to 98
- Remove soda from booking
- [ ] Stock increases back to 100

#### Test 8.3: Low Stock Alert
- If stock < minStock (e.g., 20)
- [ ] Visual indicator appears
- [ ] Maybe warning color/badge

---

### Phase 9: Settings & Configuration

#### Test 9.1: Hotel Information
- Navigate to Settings
- Update hotel info:
  - Name: "Test Hotel"
  - Phone: "+256777777777"
  - Email: "test@hotel.com"
- [ ] Changes save
- [ ] Updates across app

#### Test 9.2: Tax Rate
- Set tax rate to 18%
- Create new booking
- [ ] Tax calculated at 18%
- [ ] Shows in breakdown

#### Test 9.3: Exchange Rates
- Check exchange rates table
- [ ] USD: 3700
- [ ] EUR: 4000
- [ ] GBP: 4700
- [ ] Can update rates

---

### Phase 10: Advanced Features

#### Test 10.1: Multiple Users
- Logout
- Login as different user (manager/reception)
- [ ] Different dashboard/welcome
- [ ] Role-based permissions work

#### Test 10.2: Audit Logs
- Perform several actions
- Check audit logs (if accessible)
- [ ] Actions recorded
- [ ] Timestamps correct
- [ ] User attribution works

#### Test 10.3: Data Persistence
- Create test data
- Refresh browser (F5)
- [ ] Data still exists
- Stop and restart backend
- [ ] Data persists in database

---

## 🐛 Problem Identification

### Common Issues to Watch For:

#### Frontend Errors (Browser Console)
❌ Red errors in console  
❌ "Cannot read property"  
❌ "Network Error"  
❌ CORS errors  
❌ Failed fetch requests  

#### Backend Errors (Terminal)
❌ Database connection failed  
❌ Query timeouts  
❌ Prisma errors  
❌ Route not found (404)  
❌ Authentication failures  

#### Integration Issues
❌ Frontend can't reach backend  
❌ API returns 500 errors  
❌ Data doesn't sync  
❌ Images/assets not loading  

---

## 🔍 Specific Tests for New Features

### Finance Endpoints
```bash
# Test in browser or Postman
GET http://localhost:3001/api/finance/tax-breakdown?amount=100000&taxRate=18
Expected: { tax: 18000, subTotal: 100000, grandTotal: 118000 }

GET http://localhost:3001/api/finance/consumption?bookingId=YOUR_BOOKING_ID&taxRate=18
Expected: { consumed, remaining, daysStayed, totalDays, dailyRate }
```

### Booking with Charges
```javascript
POST http://localhost:3001/api/bookings
Body: {
  "guestName": "Charge Test",
  "phone": "+256700000001",
  "roomId": "A1",
  "checkInDate": "2026-03-05",
  "checkOutDate": "2026-03-10",
  "amount": 250000,
  "guests": 2,
  "charges": [
    {
      "id": "c1",
      "description": "Extra Soda",
      "amount": 4000,
      "date": "2026-03-05",
      "qty": 2,
      "serviceId": "5"
    }
  ],
  "status": "CONFIRMED"
}
```

Expected: Booking created with charges array populated

---

## ✅ Success Criteria

### System is Working If:

✅ Both servers start without errors  
✅ Login successful with admin credentials  
✅ Dashboard displays real data  
✅ Can create/edit/delete bookings  
✅ Room status updates correctly  
✅ Guest profiles auto-create  
✅ Financial calculations accurate  
✅ Stock tracking works  
✅ Data persists after refresh  
✅ No console errors (or minimal warnings)  

---

## 📊 Report Template

When reporting issues, use this format:

```markdown
### Issue Found: [Brief description]

**Location:**
- Page: e.g., Bookings → Create
- Action: e.g., Clicking "Save"

**Expected:**
What should happen

**Actual:**
What actually happened

**Error Messages:**
From console or terminal

**Steps to Reproduce:**
1. Go to...
2. Click...
3. See error...

**Priority:**
🔴 Critical (blocks workflow)
🟡 Medium (annoying but usable)
🟢 Low (cosmetic)
```

---

## 🚀 Next Steps After Testing

1. Complete all tests above
2. Document any issues found
3. Prioritize fixes
4. Implement solutions
5. Re-test fixed features
6. Deploy to production

---

**Testing Started:** [Current Date/Time]  
**Tester:** [Your Name]  
**Status:** In Progress  

Good luck with testing! 🎉
