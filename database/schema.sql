-- NexusHub - Master Database Schema
-- PostgreSQL Database Schema for AI-Powered Project Incubation & Escrow Marketplace

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS
-- ============================================

-- User Roles (4-Role Hierarchy)
CREATE TYPE user_role AS ENUM (
    'SYSTEM_ADMIN',    -- Approves centers, manages escrow vault
    'CENTER_ADMIN',    -- Uploads projects, manages mentors
    'MENTOR',          -- Conducts sessions, approves milestones
    'STUDENT'          -- Forms groups, pays into escrow
);

-- Account Status
CREATE TYPE account_status AS ENUM (
    'ACTIVE',
    'PENDING',
    'SUSPENDED',
    'FROZEN'
);

-- Center Approval Status
CREATE TYPE center_status AS ENUM (
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'SUSPENDED'
);

-- Project Status (Lifecycle)
CREATE TYPE project_status AS ENUM (
    'PENDING',         -- Submitted by Center Admin
    'ACTIVE',          -- Available for purchase
    'PURCHASED',       -- Bought by student group
    'IN_PROGRESS',     -- Work in progress
    'COMPLETED',       -- Certificate issued
    'ARCHIVED'
);

-- Escrow Transaction Status
CREATE TYPE escrow_status AS ENUM (
    'HELD',            -- Funds locked in escrow
    'RELEASED',        -- Funds released to center
    'REFUNDED',        -- Funds returned to students
    'DISPUTED'
);

-- Milestone Status
CREATE TYPE milestone_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);

-- ============================================
-- CORE TABLES
-- ============================================

-- Users Table (4 Roles)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    account_status account_status DEFAULT 'ACTIVE',
    full_name VARCHAR(255),
    phone VARCHAR(20),
    profile_image_url TEXT,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    
    -- IP tracking for watermarks
    last_ip_address INET,
    
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Centers/Institutions Table
CREATE TABLE centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status center_status DEFAULT 'PENDING_APPROVAL',
    
    -- Verification documents
    license_number VARCHAR(100),
    registration_document_url TEXT,
    
    -- Contact info
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    website_url TEXT,
    
    -- Financials
    total_earnings DECIMAL(12, 2) DEFAULT 0.00,
    pending_balance DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Timestamps
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_center_name UNIQUE(name)
);

-- Mentors Table (Linked to Centers)
CREATE TABLE mentors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    center_id UUID REFERENCES centers(id) ON DELETE CASCADE,
    
    -- Expertise
    specialization VARCHAR(255)[],
    years_of_experience INTEGER,
    bio TEXT,
    
    -- Performance metrics
    total_sessions INTEGER DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Showcase Projects Table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_id UUID REFERENCES centers(id) ON DELETE CASCADE,
    
    -- Project details
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    detailed_description TEXT,
    category VARCHAR(100),
    tags VARCHAR(100)[],
    
    -- Pricing
    price DECIMAL(10, 2) NOT NULL,
    
    -- Media
    thumbnail_url TEXT,
    images_urls TEXT[],
    demo_video_url TEXT,
    
    -- Tech stack
    technologies VARCHAR(100)[],
    difficulty_level VARCHAR(50), -- Beginner, Intermediate, Advanced
    estimated_duration_days INTEGER,
    
    -- Status
    status project_status DEFAULT 'PENDING',
    
    -- Metadata
    views_count INTEGER DEFAULT 0,
    purchases_count INTEGER DEFAULT 0,
    
    -- Watermark protection
    watermark_enabled BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT price_positive CHECK (price >= 0)
);

-- Student Groups Table (3 members per group)
CREATE TABLE student_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    leader_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student Group Members (Junction Table)
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES student_groups(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_group_student UNIQUE(group_id, student_id)
);

-- Escrow Transactions Table
CREATE TABLE escrow_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Parties
    student_group_id UUID REFERENCES student_groups(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    center_id UUID REFERENCES centers(id) ON DELETE SET NULL,
    
    -- Financial details
    amount DECIMAL(10, 2) NOT NULL,
    platform_fee DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Status
    status escrow_status DEFAULT 'HELD',
    
    -- Release conditions
    requires_certificate BOOLEAN DEFAULT TRUE,
    certificate_issued BOOLEAN DEFAULT FALSE,
    certificate_id UUID,
    
    -- Timestamps
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP,
    
    -- Additional metadata
    notes TEXT,
    
    CONSTRAINT amount_positive CHECK (amount > 0)
);

-- Smart QR Certificates Table
CREATE TABLE certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Reference
    escrow_transaction_id UUID REFERENCES escrow_transactions(id) ON DELETE SET NULL,
    student_group_id UUID REFERENCES student_groups(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    -- Certificate details
    certificate_number VARCHAR(100) UNIQUE NOT NULL,
    qr_code_data TEXT NOT NULL,
    qr_code_image_url TEXT,
    
    -- Issued by
    issued_by UUID REFERENCES users(id), -- Center Admin
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Certificate file
    pdf_url TEXT,
    
    -- Verification
    is_valid BOOLEAN DEFAULT TRUE,
    verification_url TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Virtual Lab Sessions Table
CREATE TABLE virtual_lab_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Session info
    mentor_id UUID REFERENCES mentors(id) ON DELETE CASCADE,
    student_group_id UUID REFERENCES student_groups(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    -- Session details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Schedule
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    
    -- Status
    is_active BOOLEAN DEFAULT FALSE,
    
    -- Code sync
    last_mentor_code TEXT,
    
    -- Recording
    recording_url TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Milestones Table
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Reference
    escrow_transaction_id UUID REFERENCES escrow_transactions(id) ON DELETE CASCADE,
    student_group_id UUID REFERENCES student_groups(id) ON DELETE CASCADE,
    
    -- Milestone details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deliverables TEXT,
    
    -- Review
    status milestone_status DEFAULT 'PENDING',
    reviewed_by UUID REFERENCES mentors(id),
    reviewed_at TIMESTAMP,
    feedback TEXT,
    
    -- Order
    sequence_number INTEGER NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Debugger Logs Table
CREATE TABLE ai_debugger_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Session reference
    lab_session_id UUID REFERENCES virtual_lab_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Error details
    error_code TEXT,
    error_message TEXT,
    student_code_snapshot TEXT,
    mentor_code_reference TEXT,
    
    -- AI analysis
    ai_suggestion TEXT,
    ai_confidence_score DECIMAL(3, 2),
    
    -- Resolution
    was_helpful BOOLEAN,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Platform Analytics Table
CREATE TABLE platform_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15, 2),
    metadata JSONB,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_metric_timestamp UNIQUE(metric_name, recorded_at)
);

-- Audit Log Table (Security & Compliance)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    ip_address INET,
    user_agent TEXT,
    changes JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(account_status);

-- Centers
CREATE INDEX idx_centers_status ON centers(status);
CREATE INDEX idx_centers_admin ON centers(admin_id);

-- Projects
CREATE INDEX idx_projects_center ON projects(center_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_category ON projects(category);
CREATE INDEX idx_projects_price ON projects(price);

-- Escrow
CREATE INDEX idx_escrow_status ON escrow_transactions(status);
CREATE INDEX idx_escrow_group ON escrow_transactions(student_group_id);
CREATE INDEX idx_escrow_project ON escrow_transactions(project_id);

-- Virtual Lab
CREATE INDEX idx_lab_mentor ON virtual_lab_sessions(mentor_id);
CREATE INDEX idx_lab_group ON virtual_lab_sessions(student_group_id);
CREATE INDEX idx_lab_active ON virtual_lab_sessions(is_active);

-- Milestones
CREATE INDEX idx_milestones_status ON milestones(status);
CREATE INDEX idx_milestones_transaction ON milestones(escrow_transaction_id);

-- Audit Logs
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ============================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_centers_updated_at BEFORE UPDATE ON centers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentors_updated_at BEFORE UPDATE ON mentors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON student_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lab_sessions_updated_at BEFORE UPDATE ON virtual_lab_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CONSTRAINTS & BUSINESS RULES
-- ============================================

-- Ensure group has maximum 3 members
CREATE OR REPLACE FUNCTION check_group_member_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM group_members WHERE group_id = NEW.group_id) >= 3 THEN
        RAISE EXCEPTION 'A student group can have a maximum of 3 members';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_group_member_limit
    BEFORE INSERT ON group_members
    FOR EACH ROW EXECUTE FUNCTION check_group_member_limit();

-- Auto-link certificate to escrow transaction
CREATE OR REPLACE FUNCTION update_escrow_on_certificate()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE escrow_transactions
    SET certificate_issued = TRUE,
        certificate_id = NEW.id
    WHERE id = NEW.escrow_transaction_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER link_certificate_to_escrow
    AFTER INSERT ON certificates
    FOR EACH ROW EXECUTE FUNCTION update_escrow_on_certificate();

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Active Projects View
CREATE VIEW active_projects_view AS
SELECT 
    p.*,
    c.name as center_name,
    c.email as center_email
FROM projects p
JOIN centers c ON p.center_id = c.id
WHERE p.status = 'ACTIVE' AND c.status = 'APPROVED';

-- Pending Center Approvals View (for System Admin)
CREATE VIEW pending_center_approvals AS
SELECT 
    c.*,
    u.username as admin_username,
    u.email as admin_email
FROM centers c
JOIN users u ON c.admin_id = u.id
WHERE c.status = 'PENDING_APPROVAL';

-- Student Group Details View
CREATE VIEW student_group_details AS
SELECT 
    sg.id as group_id,
    sg.name as group_name,
    sg.leader_id,
    COUNT(gm.student_id) as member_count,
    ARRAY_AGG(u.username) as member_usernames
FROM student_groups sg
LEFT JOIN group_members gm ON sg.id = gm.group_id
LEFT JOIN users u ON gm.student_id = u.id
GROUP BY sg.id, sg.name, sg.leader_id;

-- Escrow Dashboard View
CREATE VIEW escrow_dashboard AS
SELECT 
    et.*,
    sg.name as group_name,
    p.title as project_title,
    c.name as center_name,
    cert.certificate_number
FROM escrow_transactions et
LEFT JOIN student_groups sg ON et.student_group_id = sg.id
LEFT JOIN projects p ON et.project_id = p.id
LEFT JOIN centers c ON et.center_id = c.id
LEFT JOIN certificates cert ON et.certificate_id = cert.id;

-- ============================================
-- INITIAL SEED DATA
-- ============================================

-- Create default System Admin
INSERT INTO users (email, username, password_hash, role, full_name, account_status)
VALUES (
    'admin@nexushub.com',
    'systemadmin',
    '$2b$10$rBV2Q/X8FWBzHwKj4eBg5OQTzQ9nYsX8YqLOvlTxvBBqW7xCJKpgG', -- password: admin123
    'SYSTEM_ADMIN',
    'System Administrator',
    'ACTIVE'
);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE users IS 'Core users table supporting 4 role hierarchy';
COMMENT ON TABLE centers IS 'Verified institutions/centers selling project ideas';
COMMENT ON TABLE projects IS 'Showcase projects with Content Shield protection';
COMMENT ON TABLE escrow_transactions IS 'Payment escrow managed by System Admin';
COMMENT ON TABLE certificates IS 'Smart QR Certificates for milestone completion';
COMMENT ON TABLE virtual_lab_sessions IS 'Shadow coding sessions with WebSocket sync';
COMMENT ON TABLE ai_debugger_logs IS 'Gemini API debugging assistance logs';

-- ============================================
-- END OF SCHEMA
-- ============================================
