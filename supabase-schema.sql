-- Supabase SQL Schema for Beit HaLohem Flight Simulator Management
-- Run this in your Supabase SQL Editor to create all tables

-- ========================================
-- Users Table
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  age INTEGER,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'instructor_senior', 'instructor_junior', 'trainee')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'in_training', 'solo', 'graduate', 'frozen')),
  background TEXT,
  password TEXT NOT NULL,
  no_show_count INTEGER DEFAULT 0,
  total_hours DECIMAL DEFAULT 0,
  current_lesson INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- Schedule Table
-- ========================================
CREATE TABLE IF NOT EXISTS schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  time_start TIME NOT NULL,
  time_end TIME NOT NULL,
  day_type TEXT DEFAULT 'regular' CHECK (day_type IN ('regular', 'instructor_training', 'independent')),
  lead_instructor_id UUID REFERENCES users(id),
  second_instructor_id UUID REFERENCES users(id),
  trainee_id UUID REFERENCES users(id),
  lesson_number INTEGER,
  notes TEXT,
  completed BOOLEAN DEFAULT FALSE,
  attendance_marked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- Notices Table (Notice Board)
-- ========================================
CREATE TABLE IF NOT EXISTS notices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- Logs Table (Cancellations & Activity)
-- ========================================
CREATE TABLE IF NOT EXISTS logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  details TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- Instructor Stats Table
-- ========================================
CREATE TABLE IF NOT EXISTS instructor_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id UUID REFERENCES users(id),
  lesson_type INTEGER,
  hours DECIMAL DEFAULT 0
);

-- ========================================
-- Join Requests Table (Guest Applications)
-- ========================================
CREATE TABLE IF NOT EXISTS join_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- Indexes for Performance
-- ========================================
CREATE INDEX IF NOT EXISTS idx_schedule_date ON schedule(date);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);

-- ========================================
-- Default Admin User
-- ========================================
INSERT INTO users (name, email, phone, role, status, password)
VALUES ('ברק רוזנמן', 'barak121@gmail.com', '054-8185858', 'admin', 'active', 'Bb550550')
ON CONFLICT (email) DO NOTHING;

-- ========================================
-- Sample Welcome Notice
-- ========================================
INSERT INTO notices (content, created_at)
VALUES ('ברוכים הבאים למערכת ניהול הסימולטור!', NOW());

-- ========================================
-- Row Level Security (RLS) Policies
-- Enable RLS on all tables for production
-- ========================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Public read access for schedule and notices
CREATE POLICY "Public read schedule" ON schedule FOR SELECT USING (true);
CREATE POLICY "Public read notices" ON notices FOR SELECT USING (true);

-- Authenticated users can manage their own data
CREATE POLICY "Users can read all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- Admins can do everything (adjust based on your auth setup)
-- CREATE POLICY "Admins full access" ON users FOR ALL USING (
--   EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
-- );
