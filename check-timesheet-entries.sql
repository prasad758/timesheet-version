-- Check if timesheet_entries exist for time_clock source
-- This will show if clock-out hours are being transferred to timesheets

SELECT 
    te.id,
    te.timesheet_id,
    t.week_start,
    t.user_id,
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
FROM erp.timesheet_entries te
JOIN erp.timesheets t ON te.timesheet_id = t.id
WHERE te.source = 'time_clock'
ORDER BY te.created_at DESC
LIMIT 20;

-- If this returns NO ROWS, it means clock-out hours are NOT being added to timesheets
-- The issue is in the clock-out handler's timesheet update logic

