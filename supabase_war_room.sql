-- War Room & Alerting System Tables

-- Table for storing critical incident alerts that require human approval
CREATE TABLE IF NOT EXISTS incident_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  location TEXT,
  description TEXT,
  recommended_actions JSONB, -- Stores the AI's proposed plan (orders, alerts, etc.)
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, resolved
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE incident_alerts ENABLE ROW LEVEL SECURITY;

-- Policy for reading alerts (allow authenticated users)
CREATE POLICY "Allow authenticated read access" ON incident_alerts
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for inserting alerts (allow service role/anon for now for the agent)
CREATE POLICY "Allow insert access" ON incident_alerts
  FOR INSERT WITH CHECK (true);

-- Policy for updating alerts (approvals)
CREATE POLICY "Allow update access" ON incident_alerts
  FOR UPDATE USING (auth.role() = 'authenticated');
