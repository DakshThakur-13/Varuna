-- Varuna AI - Supabase Schema
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PATIENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mrn VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 0 AND age <= 150),
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    chief_complaint TEXT NOT NULL,
    symptom_duration VARCHAR(100),
    severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 10),
    bp_systolic INTEGER CHECK (bp_systolic >= 50 AND bp_systolic <= 300),
    bp_diastolic INTEGER CHECK (bp_diastolic >= 30 AND bp_diastolic <= 200),
    heart_rate INTEGER CHECK (heart_rate >= 20 AND heart_rate <= 300),
    respiratory_rate INTEGER CHECK (respiratory_rate >= 4 AND respiratory_rate <= 80),
    spo2 INTEGER CHECK (spo2 >= 50 AND spo2 <= 100),
    temperature DECIMAL(4,1) CHECK (temperature >= 30 AND temperature <= 45),
    temperature_unit VARCHAR(1) DEFAULT 'C' CHECK (temperature_unit IN ('C', 'F')),
    triage_level INTEGER CHECK (triage_level >= 1 AND triage_level <= 5),
    triage_classification VARCHAR(50),
    confidence_score DECIMAL(5,2),
    differential_diagnosis TEXT[],
    assigned_bed VARCHAR(100),
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'triaged', 'admitted', 'discharged')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_patients_status ON patients(status);
CREATE INDEX idx_patients_created_at ON patients(created_at DESC);
CREATE INDEX idx_patients_triage_level ON patients(triage_level);

-- ============================================================================
-- ALERTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('environmental', 'system', 'patient', 'resource')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    source VARCHAR(100),
    acknowledged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_acknowledged ON alerts(acknowledged);

-- ============================================================================
-- ENVIRONMENTAL DATA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS environmental_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aqi DECIMAL(6,2) NOT NULL,
    pm25 DECIMAL(6,2),
    pm10 DECIMAL(6,2),
    temperature DECIMAL(4,1),
    humidity DECIMAL(5,2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for time-series queries
CREATE INDEX idx_environmental_timestamp ON environmental_data(timestamp DESC);

-- ============================================================================
-- RESOURCE STATUS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS resource_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    icu_beds_total INTEGER DEFAULT 20,
    icu_beds_occupied INTEGER DEFAULT 0,
    ventilators_total INTEGER DEFAULT 15,
    ventilators_in_use INTEGER DEFAULT 0,
    ppe_stock_level INTEGER DEFAULT 100 CHECK (ppe_stock_level >= 0 AND ppe_stock_level <= 100),
    nursing_staff_on_duty INTEGER DEFAULT 30,
    doctors_on_duty INTEGER DEFAULT 10,
    oxygen_reserve_hours DECIMAL(5,1) DEFAULT 48,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default resource status row
INSERT INTO resource_status (
    icu_beds_total, icu_beds_occupied,
    ventilators_total, ventilators_in_use,
    ppe_stock_level, nursing_staff_on_duty,
    doctors_on_duty, oxygen_reserve_hours
) VALUES (
    20, 8,
    15, 5,
    85, 28,
    8, 36
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Enable RLS on all tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE environmental_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_status ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (for demo purposes)
-- In production, you would want proper authentication

CREATE POLICY "Allow anonymous read access on patients"
ON patients FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anonymous insert access on patients"
ON patients FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anonymous read access on alerts"
ON alerts FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anonymous insert access on alerts"
ON alerts FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anonymous read access on environmental_data"
ON environmental_data FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anonymous insert access on environmental_data"
ON environmental_data FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anonymous read access on resource_status"
ON resource_status FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anonymous update access on resource_status"
ON resource_status FOR UPDATE
TO anon
USING (true);

-- ============================================================================
-- STAFF TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('doctor', 'nurse', 'technician', 'admin', 'specialist')),
    department VARCHAR(100) NOT NULL,
    specialization VARCHAR(100),
    status VARCHAR(20) DEFAULT 'off-duty' CHECK (status IN ('on-duty', 'off-duty', 'on-break', 'on-call')),
    shift VARCHAR(20) CHECK (shift IN ('morning', 'afternoon', 'night')),
    phone VARCHAR(20),
    email VARCHAR(255),
    current_assignment VARCHAR(255),
    patients_assigned INTEGER DEFAULT 0,
    hours_worked DECIMAL(4,1) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_staff_status ON staff(status);
CREATE INDEX idx_staff_role ON staff(role);
CREATE INDEX idx_staff_department ON staff(department);

-- ============================================================================
-- INVENTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('medication', 'equipment', 'supplies', 'ppe', 'blood')),
    current_stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 10,
    max_stock INTEGER NOT NULL DEFAULT 100,
    unit VARCHAR(50) NOT NULL,
    location VARCHAR(100),
    supplier VARCHAR(255),
    last_restocked TIMESTAMP WITH TIME ZONE,
    expiry_date DATE,
    status VARCHAR(20) GENERATED ALWAYS AS (
        CASE 
            WHEN current_stock = 0 THEN 'out-of-stock'
            WHEN current_stock <= min_stock THEN 'critical'
            WHEN current_stock <= min_stock * 2 THEN 'low'
            ELSE 'adequate'
        END
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_inventory_category ON inventory(category);
CREATE INDEX idx_inventory_status ON inventory(status);

-- Enable RLS on new tables
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Policies for staff
CREATE POLICY "Allow anonymous read access on staff"
ON staff FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous insert access on staff"
ON staff FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous update access on staff"
ON staff FOR UPDATE TO anon USING (true);

-- Policies for inventory
CREATE POLICY "Allow anonymous read access on inventory"
ON inventory FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous insert access on inventory"
ON inventory FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous update access on inventory"
ON inventory FOR UPDATE TO anon USING (true);

-- ============================================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================================
-- Enable realtime for the tables the dashboard needs to watch

-- For Supabase, go to Database > Replication and enable the tables:
-- patients, alerts, environmental_data, resource_status, staff, inventory

-- Or run these commands:
ALTER PUBLICATION supabase_realtime ADD TABLE patients;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE environmental_data;
ALTER PUBLICATION supabase_realtime ADD TABLE resource_status;
ALTER PUBLICATION supabase_realtime ADD TABLE staff;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resource_status_updated_at
    BEFORE UPDATE ON resource_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Uncomment below to insert sample data


INSERT INTO patients (mrn, full_name, age, gender, chief_complaint, severity, bp_systolic, bp_diastolic, heart_rate, respiratory_rate, spo2, temperature, status, triage_level, triage_classification, assigned_bed)
VALUES 
    ('MRN-TEST-0001', 'Rahul Sharma', 45, 'male', 'Chest pain radiating to left arm, sweating', 8, 145, 90, 110, 22, 94, 37.2, 'triaged', 2, 'Emergent', 'Cardiac Monitored Bed 1'),
    ('MRN-TEST-0002', 'Priya Patel', 28, 'female', 'Severe shortness of breath, wheezing', 7, 130, 85, 105, 28, 89, 37.8, 'triaged', 2, 'Emergent', 'Respiratory Isolation 1'),
    ('MRN-TEST-0003', 'Amit Kumar', 65, 'male', 'Difficulty breathing, history of COPD', 6, 140, 88, 95, 24, 91, 37.0, 'triaged', 3, 'Urgent', 'ER Bed 5'),
    ('MRN-TEST-0004', 'Sneha Reddy', 34, 'female', 'Severe abdominal pain, vomiting', 7, 125, 82, 98, 20, 97, 38.1, 'admitted', 3, 'Urgent', 'ER Bed 8'),
    ('MRN-TEST-0005', 'Vikram Singh', 52, 'male', 'Cardiac arrest, CPR in progress', 10, 80, 50, 45, 8, 78, 36.5, 'triaged', 1, 'Resuscitation', 'Resuscitation Bay 1'),
    ('MRN-TEST-0006', 'Anjali Desai', 42, 'female', 'Minor laceration on forearm', 3, 120, 80, 75, 16, 99, 36.8, 'waiting', 5, 'Non-Urgent', 'Waiting Area'),
    ('MRN-TEST-0007', 'Ravi Krishnan', 58, 'male', 'Diabetic emergency, altered consciousness', 8, 160, 95, 115, 26, 92, 37.5, 'triaged', 2, 'Emergent', 'ICU Bed 3'),
    ('MRN-TEST-0008', 'Meera Joshi', 31, 'female', 'High fever, body aches, suspected dengue', 6, 118, 78, 102, 22, 96, 39.2, 'admitted', 3, 'Urgent', 'Isolation Ward 2');

INSERT INTO alerts (type, severity, title, message, source)
VALUES 
    ('environmental', 'warning', 'Elevated AQI Warning', 'AQI has risen to 285. Monitor for respiratory cases.', 'Environmental Sensor Network'),
    ('system', 'info', 'System Initialized', 'Varuna AI command center online and monitoring.', 'System'),
    ('resource', 'critical', 'ICU Bed Shortage', 'ICU occupancy at 90%. Consider early discharge protocols.', 'Resource Management'),
    ('patient', 'warning', 'High Acuity Alert', 'Multiple CTAS 1-2 patients in last hour. Staff reinforcement advised.', 'Triage System');

INSERT INTO staff (employee_id, full_name, role, department, specialization, status, shift, phone, email, current_assignment, patients_assigned, hours_worked)
VALUES
    ('EMP-001', 'Dr. Arun Mehta', 'doctor', 'Emergency', 'Emergency Medicine', 'on-duty', 'morning', '+91-9876543210', 'arun.mehta@hospital.com', 'ER Bay 1-4', 4, 6.5),
    ('EMP-002', 'Dr. Sunita Rao', 'doctor', 'Cardiology', 'Interventional Cardiology', 'on-duty', 'morning', '+91-9876543211', 'sunita.rao@hospital.com', 'CCU', 3, 7.0),
    ('EMP-003', 'Dr. Rajesh Gupta', 'doctor', 'ICU', 'Critical Care', 'on-call', 'night', '+91-9876543212', 'rajesh.gupta@hospital.com', NULL, 0, 0),
    ('EMP-004', 'Nurse Kavita Sharma', 'nurse', 'Emergency', NULL, 'on-duty', 'morning', '+91-9876543213', 'kavita.sharma@hospital.com', 'Triage Desk', 8, 5.5),
    ('EMP-005', 'Nurse Pradeep Kumar', 'nurse', 'ICU', 'Critical Care Nursing', 'on-duty', 'morning', '+91-9876543214', 'pradeep.kumar@hospital.com', 'ICU Beds 1-5', 5, 6.0),
    ('EMP-006', 'Nurse Anita Verma', 'nurse', 'Emergency', NULL, 'on-break', 'morning', '+91-9876543215', 'anita.verma@hospital.com', NULL, 0, 4.0),
    ('EMP-007', 'Tech Suresh Nair', 'technician', 'Radiology', 'CT/MRI', 'on-duty', 'morning', '+91-9876543216', 'suresh.nair@hospital.com', 'Imaging Center', 0, 5.0),
    ('EMP-008', 'Dr. Meenakshi Iyer', 'specialist', 'Pulmonology', 'Respiratory Medicine', 'on-duty', 'morning', '+91-9876543217', 'meenakshi.iyer@hospital.com', 'Respiratory Ward', 6, 7.5),
    ('EMP-009', 'Nurse Deepa Nair', 'nurse', 'Cardiology', 'Cardiac Care', 'on-duty', 'afternoon', '+91-9876543218', 'deepa.nair@hospital.com', 'CCU', 4, 2.0),
    ('EMP-010', 'Dr. Vikrant Thakur', 'doctor', 'Emergency', 'Trauma Surgery', 'off-duty', 'night', '+91-9876543219', 'vikrant.thakur@hospital.com', NULL, 0, 0);

INSERT INTO inventory (item_code, name, category, current_stock, min_stock, max_stock, unit, location, supplier, last_restocked, expiry_date)
VALUES
    ('MED-001', 'Epinephrine 1mg/mL', 'medication', 45, 20, 100, 'vials', 'Emergency Pharmacy', 'PharmaCorp India', NOW() - INTERVAL '5 days', '2026-06-15'),
    ('MED-002', 'Morphine Sulfate 10mg', 'medication', 12, 15, 50, 'ampoules', 'Controlled Substances Cabinet', 'MedSupply Ltd', NOW() - INTERVAL '2 days', '2025-12-30'),
    ('MED-003', 'Amoxicillin 500mg', 'medication', 200, 50, 500, 'tablets', 'General Pharmacy', 'Generic Pharma', NOW() - INTERVAL '10 days', '2026-03-20'),
    ('MED-004', 'Salbutamol Nebulizer', 'medication', 8, 10, 40, 'units', 'Respiratory Station', 'RespiCare', NOW() - INTERVAL '7 days', '2025-08-15'),
    ('EQP-001', 'Portable ECG Monitor', 'equipment', 5, 3, 10, 'units', 'Equipment Storage A', 'MedTech Solutions', NOW() - INTERVAL '30 days', NULL),
    ('EQP-002', 'Defibrillator Pads', 'equipment', 18, 10, 50, 'pairs', 'Emergency Bay', 'CardioEquip', NOW() - INTERVAL '15 days', '2025-09-01'),
    ('EQP-003', 'Ventilator Circuits', 'equipment', 3, 5, 20, 'sets', 'ICU Storage', 'VentMed', NOW() - INTERVAL '20 days', NULL),
    ('SUP-001', 'IV Cannula 18G', 'supplies', 150, 100, 500, 'units', 'Supply Room 1', 'MedSupplies Co', NOW() - INTERVAL '3 days', '2026-12-31'),
    ('SUP-002', 'Sterile Gauze Pads', 'supplies', 300, 200, 1000, 'packs', 'Supply Room 1', 'SterileMax', NOW() - INTERVAL '5 days', '2027-01-15'),
    ('SUP-003', 'Oxygen Tubing', 'supplies', 25, 20, 100, 'units', 'Respiratory Station', 'OxySupply', NOW() - INTERVAL '8 days', NULL),
    ('PPE-001', 'N95 Respirators', 'ppe', 500, 200, 2000, 'units', 'PPE Storage', 'SafetyFirst', NOW() - INTERVAL '7 days', '2027-06-30'),
    ('PPE-002', 'Surgical Gowns', 'ppe', 75, 50, 300, 'units', 'PPE Storage', 'MedGarments', NOW() - INTERVAL '10 days', NULL),
    ('PPE-003', 'Face Shields', 'ppe', 40, 30, 150, 'units', 'PPE Storage', 'SafetyFirst', NOW() - INTERVAL '12 days', NULL),
    ('BLD-001', 'O Positive Blood', 'blood', 8, 10, 30, 'units', 'Blood Bank', 'Red Cross', NOW() - INTERVAL '1 day', '2025-12-05'),
    ('BLD-002', 'AB Negative Blood', 'blood', 2, 5, 15, 'units', 'Blood Bank', 'Red Cross', NOW() - INTERVAL '2 days', '2025-12-03');

INSERT INTO environmental_data (aqi, pm25, pm10, temperature, humidity)
VALUES
    (285, 145.5, 210.3, 32.5, 68.5),
    (275, 138.2, 198.7, 33.1, 65.2),
    (290, 152.1, 225.4, 31.8, 70.1);

