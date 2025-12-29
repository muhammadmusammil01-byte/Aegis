# 📁 NexusHub Project Structure Documentation

## Overview
This document provides a detailed explanation of the NexusHub platform architecture, explaining each file and its purpose.

## Root Level Files

### Configuration Files
- **`.env.example`** - Template for environment variables. Copy to `.env` and configure.
- **`.gitignore`** - Specifies intentionally untracked files (node_modules, .env, logs, etc.)
- **`package.json`** - Project metadata and npm dependencies
- **`app.js`** - Main application entry point. Initializes Express, Socket.io, and all routes

### Documentation
- **`NEXUSHUB_README.md`** - Complete platform documentation with setup instructions
- **`FOLDER_STRUCTURE.md`** - This file
- **`README.md`** - Original Aegis project documentation (legacy)

### Scripts
- **`setup.sh`** - Automated setup script for quick installation
- **`test.js`** - Comprehensive test suite to verify platform functionality

## Directory Structure

### `/config`
Database and application configuration files.

- **`database.js`** - PostgreSQL connection pool configuration with query helpers

### `/database`
Database schemas and migration files.

- **`schema.sql`** - Complete PostgreSQL schema with:
  - 11 tables (users, centers, projects, groups, escrow, certificates, etc.)
  - Indexes for performance
  - Triggers for auto-updating timestamps
  - Seed data for system admin

### `/middleware`
Express middleware functions for cross-cutting concerns.

- **`authMiddleware.js`** - JWT authentication and role-based access control
  - `authenticateToken()` - Verifies JWT tokens
  - `checkRole(roles)` - Validates user roles
  - `generateToken(user)` - Creates JWT tokens
  - `verifyToken(token)` - Decodes and validates tokens
  - `getDashboardPath(role)` - Returns role-specific dashboard URL

### `/routes`
API endpoint definitions organized by feature/role.

#### Authentication Routes (`authRoutes.js`)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login with JWT
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout (client-side token removal)

#### Marketplace Routes (`marketplaceRoutes.js`) - PUBLIC
- `GET /api/marketplace/projects` - Browse all active projects
- `GET /api/marketplace/projects/:id` - Get single project details
- `GET /api/marketplace/centers` - List approved centers
- `GET /api/marketplace/centers/:id/projects` - Projects by center
- `GET /api/marketplace/search?q=keyword` - Search projects

#### System Admin Routes (`systemAdminRoutes.js`) - PROTECTED
- `GET /api/system-admin/centers/pending` - Center approval queue
- `POST /api/system-admin/centers/:id/approve` - Approve center
- `POST /api/system-admin/centers/:id/reject` - Reject center
- `GET /api/system-admin/escrow/vault` - View escrow vault
- `POST /api/system-admin/escrow/:id/release` - Release funds
- `GET /api/system-admin/stats` - Platform statistics
- `GET /api/system-admin/users` - User management
- `POST /api/system-admin/users/:id/deactivate` - Deactivate user

#### Center Admin Routes (`centerAdminRoutes.js`) - PROTECTED
- `POST /api/center-admin/centers` - Register center
- `GET /api/center-admin/my-center` - Get own center
- `POST /api/center-admin/projects` - Upload project showcase
- `GET /api/center-admin/projects` - List own projects
- `PUT /api/center-admin/projects/:id` - Update project
- `POST /api/center-admin/mentors` - Add mentor
- `GET /api/center-admin/mentors` - List mentors
- `POST /api/center-admin/certificates` - Issue Smart QR Certificate

#### Mentor Routes (`mentorRoutes.js`) - PROTECTED
- `GET /api/mentor/my-groups` - View assigned student groups
- `GET /api/mentor/groups/:id/milestones` - Get group milestones
- `POST /api/mentor/milestones/:id/approve` - Approve milestone
- `POST /api/mentor/milestones/:id/reject` - Reject milestone
- `POST /api/mentor/milestones/:id/revision` - Request revision
- `GET /api/mentor/sessions` - Session history
- `POST /api/mentor/sessions` - Create session
- `PUT /api/mentor/sessions/:id/end` - End session

#### Student Routes (`studentRoutes.js`) - PROTECTED
- `POST /api/student/groups` - Create group
- `POST /api/student/groups/:id/join` - Join group (max 3 members)
- `GET /api/student/my-groups` - List my groups
- `POST /api/student/milestones` - Submit milestone
- `GET /api/student/milestones` - Get milestones
- `POST /api/student/payments` - Make payment (escrow)
- `GET /api/student/payments/:groupId` - Payment status
- `GET /api/student/certificates` - List certificates

#### Escrow Routes (`escrowRoutes.js`) - PROTECTED
- `GET /api/escrow/transactions/:id` - Transaction details
- `GET /api/escrow/groups/:groupId/transactions` - Group transactions

### `/websocket`
Real-time WebSocket implementations.

- **`virtualLab.js`** - Virtual Lab implementation using Socket.io
  - **Namespace**: `/virtual-lab`
  - **Authentication**: JWT token required
  - **Events**:
    - `join-session` - Join a coding session
    - `mentor-code-update` - Mentor shares code (broadcasts to students)
    - `student-code-submit` - Student submits code for AI debugging
    - `session-message` - Chat in session
    - `cursor-move` - Track cursor positions
    - `leave-session` - Leave session
  - **Auto-cleanup**: Removes empty sessions

### `/public`
Frontend static files served by Express.

#### Root Pages
- **`nexushub-index.html`** - Landing page with:
  - Glassmorphic UI design
  - Feature showcase
  - How it works section
  - Call-to-action

- **`nexushub-marketplace.html`** - Public marketplace with:
  - Content Shield (anti-copy protection)
  - Dynamic watermarking (IP/Email)
  - Project browsing and filtering
  - Disabled right-click, copy, inspect

- **`login.html`** - User login with JWT authentication
- **`register.html`** - User registration with role selection

#### `/public/dashboards`
Role-specific authenticated dashboards.

- **`system-admin.html`** - System Administrator Dashboard
  - Platform statistics
  - Center approval queue
  - Escrow vault management
  - User management

- **`center-admin.html`** - Center Administrator Dashboard
  - Project showcase upload
  - Mentor management
  - Smart QR certificate issuance

- **`mentor.html`** - Mentor Dashboard
  - Assigned groups
  - Milestone approvals
  - Shadow coding sessions

- **`student.html`** - Student Dashboard
  - Group formation and management
  - Virtual Lab access
  - Real-time code mirroring
  - AI debugging interface
  - Certificate viewing

## Data Flow Examples

### 1. User Registration & Login
```
Client → POST /api/auth/register → Validate → Hash Password → Insert DB → Generate JWT → Return Token
Client stores token in localStorage → Used for subsequent requests
```

### 2. Project Purchase Flow
```
Student browses marketplace → Selects project → Forms group (3 members)
→ Makes payment → POST /api/student/payments
→ Escrow transaction created (status: 'held')
→ Funds held by System Admin
→ Group accesses Virtual Lab
```

### 3. Escrow Release Flow
```
Student completes project → Submits milestones
→ Mentor approves → POST /api/mentor/milestones/:id/approve
→ Center Admin issues certificate → POST /api/center-admin/certificates
→ System Admin releases funds → POST /api/system-admin/escrow/:id/release
→ Transaction status: 'held' → 'released'
```

### 4. Virtual Lab Session
```
Mentor creates session → POST /api/mentor/sessions
→ Students join → WebSocket: join-session
→ Mentor types code → WebSocket: mentor-code-update
→ Code mirrored to all students in real-time
→ Student submits code → WebSocket: student-code-submit
→ AI Debugger compares code → Returns suggestions
```

## Security Features

### Authentication
- JWT tokens with configurable expiration
- Bcrypt password hashing with salt rounds
- Role-based access control (RBAC)
- Session management with secure cookies

### Content Protection (Marketplace)
- Disabled right-click context menu
- Prevented copy/paste operations
- Blocked keyboard shortcuts (F12, Ctrl+Shift+I, etc.)
- Dynamic watermarking with user identification
- Screenshot detection and warnings

### API Security
- Authorization headers required for protected routes
- Role validation on all sensitive endpoints
- PostgreSQL parameterized queries (SQL injection prevention)
- Input validation using express-validator

## Database Schema Highlights

### Key Tables
1. **users** - Central user table with 4 roles
2. **centers** - Training centers with approval workflow
3. **project_showcases** - Projects offered by centers
4. **student_groups** - Groups of exactly 3 students
5. **student_group_members** - Group membership (enforces 3 members)
6. **escrow_transactions** - Fund holding and release tracking
7. **certificates** - Smart QR certificates triggering fund release
8. **milestone_approvals** - Student progress tracking
9. **ai_debug_sessions** - AI debugging history
10. **session_recordings** - Shadow coding session metadata
11. **mentors** - Mentor profiles linked to centers

### Relationships
```
centers (1) → (*) project_showcases
centers (1) → (*) mentors
project_showcases (1) → (*) student_groups
student_groups (1) → (*) student_group_members (3 max)
student_groups (1) → (*) escrow_transactions
student_groups (1) → (1) certificates
```

## Technology Choices

### Why PostgreSQL?
- ACID compliance for financial transactions (escrow)
- Complex queries with JOINs
- Triggers for automatic timestamp updates
- Better for relational data (users → groups → projects)

### Why Socket.io?
- Real-time bidirectional communication
- Automatic reconnection
- Room-based broadcasts (sessions)
- Easy integration with Express

### Why JWT?
- Stateless authentication
- Scalable (no server-side sessions)
- Works across distributed systems
- Role information embedded in token

### Why Vanilla JS?
- Zero framework overhead
- Fast page loads
- Direct DOM manipulation
- Educational clarity

### Why Tailwind CSS?
- Rapid prototyping
- Consistent design system
- Responsive utilities
- Small production bundle (with purging)

## Development Workflow

### Local Development
1. Start PostgreSQL: `sudo service postgresql start`
2. Create database: `createdb nexushub`
3. Run schema: `psql -U postgres -d nexushub -f database/schema.sql`
4. Copy environment: `cp .env.example .env`
5. Install dependencies: `npm install`
6. Run tests: `node test.js`
7. Start server: `npm run dev`
8. Access: `http://localhost:3000`

### Testing Strategy
1. **Backend Tests**: `node test.js` - Verifies all modules load correctly
2. **Manual API Testing**: Use curl or Postman with endpoints in NEXUSHUB_README.md
3. **Frontend Testing**: Open browser, test workflows
4. **WebSocket Testing**: Open multiple browser windows, test real-time features

## Deployment Considerations

### Production Checklist
- [ ] Set `NODE_ENV=production` in .env
- [ ] Use strong `JWT_SECRET` and `SESSION_SECRET`
- [ ] Enable HTTPS (Let's Encrypt)
- [ ] Use managed PostgreSQL (AWS RDS, DigitalOcean, etc.)
- [ ] Set up process manager (PM2)
- [ ] Configure reverse proxy (Nginx)
- [ ] Enable CORS only for trusted origins
- [ ] Set up database backups
- [ ] Configure logging (Winston, Morgan)
- [ ] Set up monitoring (PM2 Plus, New Relic)

### Scaling
- Horizontal scaling: Multiple app instances behind load balancer
- WebSocket sticky sessions: Required for Socket.io
- Database connection pooling: Already configured (max: 20)
- Redis for session storage: Consider for multi-instance deployments

## Future Enhancements

### Phase 2
- Payment gateway integration (Stripe)
- Email notifications (SendGrid)
- File upload for project materials (AWS S3)
- Video conferencing (WebRTC)
- Mobile-responsive dashboards

### Phase 3
- Mobile apps (React Native)
- Advanced analytics dashboard
- Machine learning for project recommendations
- Blockchain certificate verification
- Multi-language support (i18n)

## Support & Contribution

For questions or contributions:
1. Check NEXUSHUB_README.md for documentation
2. Open GitHub issues for bugs
3. Submit pull requests for features
4. Follow existing code style and patterns

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintainer**: NexusHub Team
