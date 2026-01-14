-- Add columns to store event start/end times separately
ALTER TABLE case_activities
ADD COLUMN start_time TIME,
ADD COLUMN end_time TIME,
ADD COLUMN end_date DATE;