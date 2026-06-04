# Timezone Fix Plan — Canteen Ticket System

## Problem Summary
All dates and times displayed in the Meal Records table and Reports table are incorrect because of timezone mismatches. The system runs in **Africa/Lagos (UTC+1)** but dates/times are stored and/or displayed in UTC without proper conversion.

### Evidence from user:
- Ticket `101-2026-05-13-08:33:29:514` printed at 08:33 Lagos time on May 13
- **Meal Records**: Event Date shows `2026-05-12` (off by 1 day), Recorded Time shows `07:33:25` (off by 1 hour)
- **Reports**: Event Date shows `2026-05-11T23:00:00.000Z` (off by ~2 days), Recorded Time shows `09:33:25` (off by 1 hour the other direction)
- **Ticket number** encodes the correct local date/time

---

## Root Causes

### Root Cause 1: `event_date` column is `DATE` type, populated with `NOW()` (UTC)
**File:** `canteen-ticket-backend/src/routes/data.ts:656`
```sql
INSERT INTO tickets (..., event_date, ...) VALUES (..., NOW(), ...)
```
- `NOW()` returns UTC time
- `DATE` type stores only the date portion of UTC
- At 00:30 Lagos = 23:30 UTC (previous day), the date is wrong
- **Fix:** Use `NOW() AT TIME ZONE 'Africa/Lagos'` or store as `TIMESTAMPTZ`

### Root Cause 2: `printed_at` column is `TIMESTAMP WITHOUT TIME ZONE` with `DEFAULT NOW()`
**File:** `canteen-ticket-backend/database/migrations/001_initial_schema.sql:35`
```sql
printed_at TIMESTAMP DEFAULT NOW()
```
- `TIMESTAMP` (without time zone) + `NOW()` stores UTC value but without timezone metadata
- When PostgreSQL's `AT TIME ZONE 'UTC'` is applied, it may double-convert depending on server timezone
- **Fix:** Change to `TIMESTAMPTZ` and use `NOW() AT TIME ZONE 'Africa/Lagos'` for storage, OR handle conversion at application level

### Root Cause 3: Frontend `splitDateTime` displays raw UTC ISO strings without conversion
**File:** `canteen-ticket/app/dashboard/tickets/page.tsx:48-52`
```js
const splitDateTime = (datetimeStr: string) => {
  if (!datetimeStr) return { date: '-', time: '-' };
  const [date, time] = datetimeStr.split('T');
  return { date, time: time ? time.split('.')[0] : '-' };
};
```
- Splits `"2026-05-13T07:33:25.000Z"` → date: `2026-05-13`, time: `07:33:25`
- Should be: date: `2026-05-13`, time: `08:33:25` (Lagos)
- **Fix:** Use `new Date()` + `toLocaleDateString()` / `toLocaleTimeString()` for local conversion

### Root Cause 4: Reports table shows raw `event_date` instead of timezone-corrected value
**File:** `canteen-ticket/app/dashboard/reports/page.tsx:758`
- The backend query returns `event_date_local` (corrected) and `event_date` (raw)
- The frontend mapper assigns `event_date: eventDateLocal` (correct)
- BUT the reports table column `Event Date` shows `r.event_date` which should be the mapped value
- The user's data shows `2026-05-11T23:00:00.000Z` which is the raw UTC timestamp — suggesting the mapper is NOT working correctly, or the `event_date_local` value from the backend is also wrong
- **Fix:** Ensure backend conversion is correct and frontend uses the corrected value

### Root Cause 5: Backend `AT TIME ZONE` conversion may be double-converting
**File:** `canteen-ticket-backend/src/routes/data.ts:936-939`
```sql
(t.event_date AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Lagos')::DATE as event_date_local,
TO_CHAR(t.printed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Lagos', 'YYYY-MM-DD') as printed_date,
TO_CHAR(t.printed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Lagos', 'HH24:MI:SS') as printed_time
```
- If `printed_at` is `TIMESTAMP WITHOUT TIME ZONE` and already stores Lagos time (because the PG server is in Lagos), then `AT TIME ZONE 'UTC'` treats it as UTC, and converting to Lagos adds another hour → double conversion
- **Fix:** Need to know the actual PostgreSQL server timezone setting, then apply correct conversion

---

## Fix Strategy

### Approach: Fix at the source (backend) + fix frontend display

The cleanest approach is:
1. **Store all timestamps correctly** using `TIMESTAMPTZ` in the database
2. **Convert to Lagos time in backend queries** when returning data
3. **Fix frontend to display local time** for any raw ISO strings

---

## Detailed Fix Steps

### Step 1: Fix database schema — change `event_date` and `printed_at` to `TIMESTAMPTZ`
**File:** `canteen-ticket-backend/database/migrations/` (new migration `004_fix_timezone.sql`)

```sql
-- Change event_date from DATE to TIMESTAMPTZ
ALTER TABLE tickets 
  ALTER COLUMN event_date TYPE TIMESTAMPTZ 
  USING event_date::TIMESTAMPTZ;

-- Change printed_at from TIMESTAMP to TIMESTAMPTZ  
ALTER TABLE tickets 
  ALTER COLUMN printed_at TYPE TIMESTAMPTZ 
  USING printed_at::TIMESTAMPTZ;
```

### Step 2: Fix ticket creation to store Lagos time
**File:** `canteen-ticket-backend/src/routes/data.ts:656`

Change:
```sql
INSERT INTO tickets (ticket_number, zk_user_id, event_name, event_date, name, department, amount) 
VALUES ($1, $2, $3, NOW(), $4, $5, $6) RETURNING *
```
To:
```sql
INSERT INTO tickets (ticket_number, zk_user_id, event_name, event_date, name, department, amount) 
VALUES ($1, $2, $3, (NOW() AT TIME ZONE 'Africa/Lagos'), $4, $5, $6) RETURNING *
```

### Step 3: Fix ticket number generation to use local time
**File:** `canteen-ticket-backend/src/routes/data.ts:632-636`

Change from using `toISOString()` (UTC) to using local time methods:
```js
const now = new Date();
const pad = (n: number) => n.toString().padStart(2, '0');
const dateStr = `${now.getFullYear()}${pad(now.getMonth()+1)}${now.getDate()}`;
const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
const ticketNumber = zk_user_id + '-' + dateStr + '-' + timeStr + '-' + random;
```

### Step 4: Fix backend `/tickets` query timezone conversion
**File:** `canteen-ticket-backend/src/routes/data.ts:936-939`

Since columns are now `TIMESTAMPTZ`, the conversion should be:
```sql
TO_CHAR(t.event_date AT TIME ZONE 'Africa/Lagos', 'YYYY-MM-DD') as event_date_local,
TO_CHAR(t.printed_at AT TIME ZONE 'Africa/Lagos', 'YYYY-MM-DD') as printed_date,
TO_CHAR(t.printed_at AT TIME ZONE 'Africa/Lagos', 'HH24:MI:SS') as printed_time
```

### Step 5: Fix frontend `splitDateTime` in Meal Records page
**File:** `canteen-ticket/app/dashboard/tickets/page.tsx:48-52`

Replace raw string splitting with proper Date object conversion:
```js
const splitDateTime = (datetimeStr: string) => {
  if (!datetimeStr) return { date: '-', time: '-' };
  const d = new Date(datetimeStr);
  if (isNaN(d.getTime())) return { date: '-', time: '-' };
  const date = d.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
  const time = d.toLocaleTimeString('en-GB', { hour12: false }); // HH:MM:SS in local time
  return { date, time };
};
```

### Step 6: Fix Meal Records PDF export to use corrected dates
**File:** `canteen-ticket/app/dashboard/tickets/page.tsx:61-73`

The PDF export uses `splitDateTime` — once that's fixed, the export will be correct. But also need to ensure the "Date" column uses `eventDate` (from `event_date_local`) and "Time" uses `printedTime`.

### Step 7: Fix Meal Records Excel export similarly
**File:** `canteen-ticket/app/dashboard/tickets/page.tsx:88-101`

Same fix as PDF — uses `splitDateTime` which will be corrected.

### Step 8: Fix Reports page table display
**File:** `canteen-ticket/app/dashboard/reports/page.tsx:758`

The reports table shows `r.event_date` which after the frontend mapper should be the corrected `event_date_local`. Need to verify the mapper is working:
- Line 136: `const eventDateLocal = r.event_date_local || r.event_date || '';`
- Line 149: `event_date: eventDateLocal,`

This should work IF the backend returns `event_date_local` correctly. After Step 4 fix, this should be resolved.

### Step 9: Fix Reports PDF and Excel exports
**File:** `canteen-ticket/app/dashboard/reports/page.tsx:277-285` and `305-312`

These use `r.event_date` and `r.event_time` from the mapped records. After the mapper fix, these should be correct.

---

## Files to Modify

| File | Change |
|------|--------|
| `canteen-ticket-backend/database/migrations/004_fix_timezone.sql` (new) | Schema migration for TIMESTAMPTZ |
| `canteen-ticket-backend/src/routes/data.ts` | Fix ticket creation, ticket number generation, and timezone queries |
| `canteen-ticket/app/dashboard/tickets/page.tsx` | Fix `splitDateTime` for local time display |
| `canteen-ticket/app/dashboard/reports/page.tsx` | Verify mapper uses corrected dates |

---

## Verification Steps

1. Issue a new ticket and verify:
   - Ticket number date/time matches actual local time
   - `event_date` in DB stores correct Lagos date
   - `printed_at` in DB stores correct Lagos timestamp

2. Check Meal Records table:
   - Event Date shows correct local date
   - Recorded Date shows correct local date
   - Recorded Time shows correct local time (UTC+1)

3. Check Reports table:
   - Event Date shows correct local date (not raw ISO)
   - Recorded Time shows correct local time

4. Export PDF and Excel from both pages and verify dates/times are correct
