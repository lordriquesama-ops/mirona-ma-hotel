# Revenue Chart Not Showing Data - Analysis

## Current Behavior:
Chart only shows revenue on the **check-in date** of bookings.

Example:
- Guest checked in on March 5th
- Today is March 14th
- Chart shows last 7 days (March 8-14)
- Revenue from March 5th doesn't appear ❌

## Why This Happens:
```typescript
if (b.checkIn === dateStr) {
    // Only counts revenue on check-in date
    dayRev += roomRev;
}
```

## Options to Fix:

### Option 1: Show Revenue Throughout Stay
Count revenue for each day the guest is staying (spread across stay duration)

### Option 2: Show All Active Bookings
Count revenue from any booking that's CHECKED_IN or CHECKED_OUT, regardless of check-in date

### Option 3: Show Payment Dates
Count revenue on the date payment was actually received

## Recommendation:
**Option 2** - Show all active bookings' revenue distributed across the chart period.

This way:
- March 5th check-in still shows on the chart
- Revenue appears as long as guest is checked in
- More realistic view of current revenue
