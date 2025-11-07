-- Debug query to see what the GET /api/timesheets endpoint should return
-- This helps identify if the issue is in the query or frontend display

-- 1. Check all timesheet entries with details
SELECT 
    t.id as timesheet_id,
    t.user_id,
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
    (te.mon_hours + te.tue_hours + te.wed_hours + te.thu_hours + 
     te.fri_hours + te.sat_hours + te.sun_hours) as total_hours,
    te.created_at,
    te.updated_at
FROM erp.timesheets t
LEFT JOIN erp.timesheet_entries te ON t.id = te.timesheet_id
WHERE te.source = 'time_clock' OR te.source IS NULL
ORDER BY t.week_start DESC, te.created_at DESC;

-- 2. Check specific week (replace with your actual week_start date)
-- Replace 'YOUR_USER_ID' and '2025-11-03' with actual values
SELECT 
    t.id as timesheet_id,
    t.week_start,
    t.week_end,
    COUNT(te.id) as entry_count,
    STRING_AGG(te.source, ', ') as entry_sources
FROM erp.timesheets t
LEFT JOIN erp.timesheet_entries te ON t.id = te.timesheet_id
WHERE t.user_id = 'YOUR_USER_ID'  -- Replace with your user ID
  AND CAST(t.week_start AS DATE) = '2025-11-03'::DATE  -- Replace with your week start
GROUP BY t.id, t.week_start, t.week_end;

-- 3. Check if time_clock entries are linked to correct timesheets
SELECT 
    te.id,
    te.timesheet_id,
    t.week_start,
    t.user_id,
    te.project,
    te.task,
    te.source,
    te.mon_hours + te.tue_hours + te.wed_hours + te.thu_hours + 
    te.fri_hours + te.sat_hours + te.sun_hours as total_hours
FROM erp.timesheet_entries te
JOIN erp.timesheets t ON te.timesheet_id = t.id
WHERE te.source = 'time_clock'
ORDER BY te.created_at DESC;

