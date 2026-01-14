-- SQL Queries to Check Clock-Out Hours in Database
-- Run these in your PostgreSQL database (pgAdmin, psql, or any SQL client)

-- ============================================
-- 1. Check Recent Clock-In/Clock-Out Entries
-- ============================================
-- This shows all time clock entries (clock-in/clock-out records)
SELECT 
    id,
    user_id,
    issue_id,
    project_name,
    clock_in,
    clock_out,
    total_hours,
    status,
    created_at,
    updated_at
FROM erp.time_clock
WHERE status = 'clocked_out'
ORDER BY clock_out DESC
LIMIT 20;

-- ============================================
-- 2. Check Timesheet Entries with Time Clock Source
-- ============================================
-- This shows entries added to timesheets from clock-out
SELECT 
    te.id,
    te.timesheet_id,
    t.week_start,
    t.week_end,
    t.user_id,
    te.project,
    te.task,
    te.mon_hours,
    te.tue_hours,
    te.wed_hours,
    te.thu_hours,
    te.fri_hours,
    te.sat_hours,
    te.sun_hours,
    te.source,
    te.created_at,
    te.updated_at,
    (te.mon_hours + te.tue_hours + te.wed_hours + te.thu_hours + te.fri_hours + te.sat_hours + te.sun_hours) as total_hours
FROM erp.timesheet_entries te
JOIN erp.timesheets t ON te.timesheet_id = t.id
WHERE te.source = 'time_clock'
ORDER BY te.updated_at DESC
LIMIT 20;

-- ============================================
-- 3. Check All Timesheets for a Specific User
-- ============================================
-- Replace 'YOUR_USER_ID' with your actual user ID
SELECT 
    t.id,
    t.user_id,
    t.week_start,
    t.week_end,
    t.status,
    COUNT(te.id) as entry_count,
    t.created_at,
    t.updated_at
FROM erp.timesheets t
LEFT JOIN erp.timesheet_entries te ON t.id = te.timesheet_id
WHERE t.user_id = 'YOUR_USER_ID'  -- Replace with your user ID
GROUP BY t.id
ORDER BY t.week_start DESC;

-- ============================================
-- 4. Check Timesheet Entries for Current Week
-- ============================================
-- Replace 'YOUR_USER_ID' and '2025-11-03' with your user ID and week start date
SELECT 
    t.id as timesheet_id,
    t.week_start,
    t.week_end,
    te.id as entry_id,
    te.project,
    te.task,
    te.source,
    te.mon_hours,
    te.tue_hours,
    te.wed_hours,
    te.thu_hours,
    te.fri_hours,
    te.sat_hours,
    te.sun_hours,
    (te.mon_hours + te.tue_hours + te.wed_hours + te.thu_hours + te.fri_hours + te.sat_hours + te.sun_hours) as total_hours,
    te.created_at,
    te.updated_at
FROM erp.timesheets t
LEFT JOIN erp.timesheet_entries te ON t.id = te.timesheet_id
WHERE t.user_id = 'YOUR_USER_ID'  -- Replace with your user ID
  AND CAST(t.week_start AS DATE) = '2025-11-03'::DATE  -- Replace with your week start date
ORDER BY te.source, te.created_at;

-- ============================================
-- 5. Summary: Count Clock-Out Entries by Day
-- ============================================
SELECT 
    DATE(clock_out) as clock_out_date,
    COUNT(*) as clock_out_count,
    SUM(total_hours) as total_hours,
    AVG(total_hours) as avg_hours
FROM erp.time_clock
WHERE status = 'clocked_out'
  AND clock_out IS NOT NULL
GROUP BY DATE(clock_out)
ORDER BY clock_out_date DESC
LIMIT 10;

-- ============================================
-- 6. Check if Timesheet Entries Exist for Recent Clock-Outs
-- ============================================
-- This compares time_clock entries with timesheet_entries
SELECT 
    tc.id as clock_entry_id,
    tc.clock_out,
    tc.total_hours as clock_hours,
    tc.project_name,
    DATE(tc.clock_out) as clock_out_date,
    CASE 
        WHEN te.id IS NOT NULL THEN 'YES - In Timesheet'
        ELSE 'NO - Missing from Timesheet'
    END as in_timesheet,
    te.id as timesheet_entry_id,
    te.mon_hours + te.tue_hours + te.wed_hours + te.thu_hours + te.fri_hours + te.sat_hours + te.sun_hours as timesheet_hours
FROM erp.time_clock tc
LEFT JOIN erp.timesheet_entries te ON (
    te.source = 'time_clock' 
    AND te.project = COALESCE(tc.project_name, 'General')
    AND DATE(tc.clock_out) BETWEEN 
        (SELECT week_start FROM erp.timesheets WHERE id = te.timesheet_id) AND
        (SELECT week_end FROM erp.timesheets WHERE id = te.timesheet_id)
)
WHERE tc.status = 'clocked_out'
  AND tc.clock_out >= NOW() - INTERVAL '7 days'
ORDER BY tc.clock_out DESC
LIMIT 20;

-- ============================================
-- 7. Get Your User ID (if you don't know it)
-- ============================================
SELECT 
    id,
    email,
    full_name,
    created_at
FROM erp.users
WHERE email = 'your-email@example.com';  -- Replace with your email

