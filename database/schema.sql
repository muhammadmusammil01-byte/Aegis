-- NexusHub Database Schema
-- PostgreSQL 14+
-- AI-Powered Project Incubation & Escrow Marketplace

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS session_recordings CASCADE;
DROP TABLE IF EXISTS milestone_approvals CASCADE;
DROP TABLE IF EXISTS ai_debug_sessions CASCADE;
DROP TABLE IF EXISTS escrow_transactions CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS student_group_members CASCADE;
DROP TABLE IF EXISTS student_groups CASCADE;
DROP TABLE IF EXISTS project_showcases CASCADE;
DROP TABLE IF EXISTS mentors CASCADE;
DROP TABLE IF EXISTS centers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table with 4-role RBAC
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('system_admin', 'center_admin', 'mentor', 'student')),
    phone VARCHAR(20),
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    profile_image VARCHAR(500)
);

-- Centers table (managed by System Admin, operated by Center Admin)
CREATE TABLE centers (
    center_id SERIAL PRIMARY KEY,
    center_name VARCHAR(255) NOT NULL,
    center_admin_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    description TEXT,
    location VARCHAR(255),
    established_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
    approval_date TIMESTAMP,
    approved_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mentors table (managed by Center Admin)
CREATE TABLE mentors (
    mentor_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    center_id INTEGER REFERENCES centers(center_id) ON DELETE CASCADE,
    expertise TEXT[],
    years_of_experience INTEGER,
    bio TEXT,
    hourly_rate DECIMAL(10, 2),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, center_id)
);

-- Project Showcases (uploaded by Center Admin)
CREATE TABLE project_showcases (
    project_id SERIAL PRIMARY KEY,
    center_id INTEGER REFERENCES centers(center_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    tech_stack TEXT[],
    difficulty_level VARCHAR(50) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    estimated_duration_weeks INTEGER,
    price DECIMAL(10, 2) NOT NULL,
    thumbnail_url VARCHAR(500),
    detailed_content TEXT,
    learning_outcomes TEXT[],
    prerequisites TEXT[],
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'inactive', 'sold_out')),
    views_count INTEGER DEFAULT 0,
    purchases_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student Groups (3 members per group)
CREATE TABLE student_groups (
    group_id SERIAL PRIMARY KEY,
    group_name VARCHAR(255) NOT NULL,
    project_id INTEGER REFERENCES project_showcases(project_id) ON DELETE SET NULL,
    leader_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'forming' CHECK (status IN ('forming', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student Group Members (enforces 3 members)
CREATE TABLE student_group_members (
    member_id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES student_groups(group_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    role_in_group VARCHAR(50) CHECK (role_in_group IN ('leader', 'member')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);

-- Escrow Transactions (System Admin holds funds)
CREATE TABLE escrow_transactions (
    transaction_id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES student_groups(group_id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES project_showcases(project_id) ON DELETE SET NULL,
    center_id INTEGER REFERENCES centers(center_id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'held', 'released', 'refunded', 'disputed')),
    payment_method VARCHAR(100),
    payment_reference VARCHAR(255),
    held_at TIMESTAMP,
    released_at TIMESTAMP,
    release_trigger VARCHAR(100), -- e.g., 'smart_qr_certificate'
    certificate_id INTEGER,
    system_admin_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Smart QR Certificates (issued by Center Admin to trigger fund release)
CREATE TABLE certificates (
    certificate_id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES student_groups(group_id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES project_showcases(project_id) ON DELETE SET NULL,
    issued_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    certificate_code VARCHAR(100) UNIQUE NOT NULL,
    qr_code_data TEXT NOT NULL,
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verification_url VARCHAR(500),
    student_names TEXT[],
    project_completion_details TEXT,
    skills_acquired TEXT[],
    certificate_url VARCHAR(500)
);

-- Milestone Approvals (Mentor approves student progress)
CREATE TABLE milestone_approvals (
    approval_id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES student_groups(group_id) ON DELETE CASCADE,
    mentor_id INTEGER REFERENCES mentors(mentor_id) ON DELETE SET NULL,
    milestone_title VARCHAR(255) NOT NULL,
    milestone_description TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision_required')),
    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    review_date TIMESTAMP,
    mentor_feedback TEXT,
    approval_percentage INTEGER CHECK (approval_percentage >= 0 AND approval_percentage <= 100)
);

-- AI Debug Sessions (Gemini API integration)
CREATE TABLE ai_debug_sessions (
    session_id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES student_groups(group_id) ON DELETE CASCADE,
    mentor_id INTEGER REFERENCES mentors(mentor_id) ON DELETE SET NULL,
    student_code TEXT NOT NULL,
    mentor_code TEXT NOT NULL,
    error_detected TEXT,
    ai_suggestion TEXT,
    error_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session Recordings (Virtual Lab - Shadow Coding)
CREATE TABLE session_recordings (
    recording_id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES student_groups(group_id) ON DELETE CASCADE,
    mentor_id INTEGER REFERENCES mentors(mentor_id) ON DELETE SET NULL,
    session_title VARCHAR(255),
    session_type VARCHAR(50) CHECK (session_type IN ('shadow_coding', 'code_review', 'debugging', 'mentorship')),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_minutes INTEGER,
    recording_url VARCHAR(500),
    code_snapshot TEXT
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_centers_status ON centers(status);
CREATE INDEX idx_projects_center ON project_showcases(center_id);
CREATE INDEX idx_projects_status ON project_showcases(status);
CREATE INDEX idx_groups_project ON student_groups(project_id);
CREATE INDEX idx_escrow_status ON escrow_transactions(status);
CREATE INDEX idx_certificates_code ON certificates(certificate_code);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_centers_updated_at BEFORE UPDATE ON centers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentors_updated_at BEFORE UPDATE ON mentors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON project_showcases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON student_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escrow_updated_at BEFORE UPDATE ON escrow_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed data: System Admin
INSERT INTO users (email, password_hash, full_name, role, is_active) 
VALUES 
    ('admin@nexushub.com', '$2b$10$YourHashedPasswordHere', 'System Administrator', 'system_admin', TRUE);

-- Comments for documentation
COMMENT ON TABLE users IS 'All users with 4-role RBAC: system_admin, center_admin, mentor, student';
COMMENT ON TABLE centers IS 'Verified centers that can sell project ideas and mentorship';
COMMENT ON TABLE escrow_transactions IS 'System Admin holds funds until Smart QR Certificate triggers release';
COMMENT ON TABLE certificates IS 'Smart QR Certificates issued by Center Admin to release escrow funds';
COMMENT ON TABLE session_recordings IS 'Virtual Lab Shadow Coding sessions with real-time mirroring';
COMMENT ON TABLE ai_debug_sessions IS 'Gemini API powered AI debugging comparing student vs mentor code';
