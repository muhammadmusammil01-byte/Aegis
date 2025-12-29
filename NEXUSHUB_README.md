# 🎯 NexusHub - AI-Powered Project Incubation & Escrow Marketplace

> A multi-tenant platform connecting students with verified centers for project-based learning, featuring AI-powered mentorship, secure escrow payments, and real-time collaborative workspaces.

## 🌟 Overview

NexusHub is a comprehensive marketplace platform that revolutionizes project-based learning by connecting:
- **Students** who want to buy project ideas and mentorship
- **Verified Centers** that offer showcase projects and expert guidance
- **Mentors** who conduct "Shadow Coding" sessions
- **System Admins** who manage the entire ecosystem and escrow vault

## ✨ Core Features

### 🛡️ Content Shield (High-Security Protection)
- **Anti-Theft Protection**: Disable right-click, copy-paste prevention
- **Dynamic Watermarking**: IP address and email watermarks on all content
- **DevTools Detection**: Monitors and logs developer tool usage
- **Screenshot Detection**: Tracks potential content theft attempts

### 💰 Escrow Payment System
- Funds held securely by System Admin
- Released only after Smart QR Certificate issuance
- Transparent transaction tracking
- Automated payment distribution

### 🧪 Virtual Lab (Real-Time Collaboration)
- WebSocket-powered code synchronization
- Mentor's editor mirrored to students' screens
- Live "Shadow Coding" sessions
- Real-time collaboration tools

### 🤖 AI Debugger (Gemini API)
- Intelligent error detection
- Code comparison against mentor's logic
- Smart suggestions and fixes
- Learning-focused debugging assistance

### 📜 Smart QR Certificates
- Blockchain-inspired verification
- Tamper-proof digital certificates
- Instant validation via QR codes
- Professional PDF generation

## 🏗️ Architecture

### Tech Stack
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL with advanced schema
- **Real-time**: Socket.io for Virtual Lab
- **Frontend**: HTML5 + Tailwind CSS + Vanilla JavaScript
- **Authentication**: JWT tokens with role-based access
- **AI Integration**: Google Gemini API

### 4-Role Hierarchy (RBAC)

#### 👑 System Admin
- Approve/reject center applications
- Manage escrow vault and fund releases
- Platform analytics and oversight
- User management and moderation

#### 🏢 Center Admin
- Upload showcase projects
- Manage mentors and resources
- Issue Smart QR Certificates
- Track center performance

#### 👨‍🏫 Mentor
- Conduct Shadow Coding sessions
- Approve student milestones
- Provide AI-assisted debugging help
- Real-time code collaboration

#### 🎓 Student
- Form groups of 3 members
- Browse and purchase projects
- Collaborate in Virtual Lab
- Receive certificates upon completion

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- PostgreSQL 13+
- Google Gemini API key (for AI features)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/muhammadmusammil01-byte/Aegis.git
cd Aegis
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up PostgreSQL database**
```bash
# Create database
createdb nexushub

# Run schema
psql -d nexushub -f database/schema.sql
```

4. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your settings
```

Required environment variables:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nexushub
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
```

5. **Start the server**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

6. **Access the application**
```
Landing Page: http://localhost:3000
Marketplace: http://localhost:3000/marketplace
Login: http://localhost:3000/login
API Docs: http://localhost:3000/api/info
Health Check: http://localhost:3000/api/health
```

## 📁 Project Structure

```
NexusHub/
├── app.js                      # Main server entry point
├── config/                     # Configuration files
│   ├── database.js            # PostgreSQL connection
│   └── jwt.js                 # JWT settings
├── middleware/                # Middleware functions
│   └── rbac.js                # Role-based access control
├── routes/nexus/              # API routes
│   ├── auth.js                # Authentication
│   ├── marketplace.js         # Public marketplace
│   ├── escrow.js              # Escrow management
│   ├── systemAdmin.js         # Admin routes
│   ├── centerAdmin.js         # Center routes
│   ├── mentor.js              # Mentor routes
│   └── student.js             # Student routes
├── sockets/                   # WebSocket handlers
│   └── virtualLab.js          # Virtual Lab real-time
├── database/                  # Database files
│   └── schema.sql             # PostgreSQL schema
├── public/                    # Frontend assets
│   ├── css/nexus/
│   │   └── glassmorphic.css   # UI framework
│   ├── js/nexus/
│   │   └── contentShield.js   # Anti-theft protection
│   └── pages/
│       ├── index.html         # Landing page
│       ├── login.html         # Authentication
│       ├── marketplace.html   # Browse projects
│       └── project-view.html  # Protected view
└── package.json               # Dependencies
```

## 🎨 Frontend Pages

| Page | Route | Description | Protection |
|------|-------|-------------|------------|
| **Landing** | `/` | Public homepage | None |
| **Login/Register** | `/login` | Authentication | None |
| **Marketplace** | `/marketplace` | Browse projects | Public |
| **Project View** | `/project/:id` | Detailed view | Content Shield |
| **Dashboard** | `/dashboard` | Role-based redirect | JWT Required |

### Role-Specific Dashboards

- **System Admin**: `/system-admin/dashboard`
  - Center approvals
  - Escrow vault management
  - Platform analytics

- **Center Admin**: `/center-admin/dashboard`
  - Project management
  - Mentor assignments
  - Certificate issuance

- **Mentor**: `/mentor/dashboard`
  - Active sessions
  - Student milestones
  - Virtual Lab access

- **Student**: `/student/dashboard`
  - Group management
  - Purchased projects
  - Virtual Lab participation

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register     - Create new account
POST   /api/auth/login        - User login
GET    /api/auth/me           - Current user profile
POST   /api/auth/refresh      - Refresh JWT token
```

### Marketplace (Public)
```
GET    /api/marketplace       - List active projects
GET    /api/marketplace/:id   - Project details
```

### System Admin (Protected)
```
GET    /api/system-admin/dashboard           - Admin dashboard
GET    /api/system-admin/centers/pending     - Pending approvals
POST   /api/system-admin/centers/:id/approve - Approve center
```

### Escrow (Protected)
```
POST   /api/escrow/initiate   - Create escrow transaction
POST   /api/escrow/release/:id - Release funds
GET    /api/escrow/:id        - Transaction details
```

### Virtual Lab (WebSocket)
```
WS     /virtual-lab           - Real-time collaboration
Events:
  - join-session
  - mentor-code-update
  - code-sync
  - request-help
```

## 🛡️ Security Features

### Content Shield Protection
All project detail pages are protected with:
- ✅ Right-click disabled
- ✅ Copy-paste prevention
- ✅ Keyboard shortcut blocking (Ctrl+C, Ctrl+S, etc.)
- ✅ Dynamic watermarking (email + IP)
- ✅ DevTools detection
- ✅ Screenshot attempt logging
- ✅ Drag-and-drop disabled
- ✅ Text selection protection

### Authentication & Authorization
- JWT-based stateless authentication
- Role-based access control (RBAC)
- Automatic token refresh
- Account status checking (Active/Suspended/Frozen)
- Audit logging for all actions

### Database Security
- Parameterized queries (SQL injection prevention)
- Password hashing with bcrypt
- Transaction atomicity
- Constraint enforcement
- Audit trail tables

## 🎯 Complete User Workflows

### Student Journey
1. Register as Student
2. Form or join a group (max 3 members)
3. Browse marketplace for projects
4. Purchase project (payment held in escrow)
5. Participate in Virtual Lab sessions
6. Submit milestones for mentor approval
7. Receive Smart QR Certificate
8. Escrow funds released to center

### Center Admin Journey
1. Register as Center Admin
2. Wait for System Admin approval
3. Upload showcase projects
4. Assign mentors to projects
5. Monitor student progress
6. Issue Smart QR Certificates
7. Receive escrow payments

### Mentor Journey
1. Register as Mentor (assigned to center)
2. Conduct Shadow Coding sessions
3. Share code via Virtual Lab
4. Assist with AI Debugger
5. Review and approve milestones
6. Provide feedback to students

### System Admin Journey
1. Login as System Admin
2. Review and approve center applications
3. Monitor platform analytics
4. Manage escrow vault
5. Release funds upon certificate issuance
6. Handle disputes and moderation

## 🔧 Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Database Migrations
```bash
# Create migration
psql -d nexushub -f database/migrations/001_migration.sql
```

## 📊 Database Schema Highlights

### Key Tables
- **users**: 4-role hierarchy with RBAC
- **centers**: Verified institutions
- **projects**: Showcase projects with protection
- **student_groups**: Team collaboration (max 3)
- **escrow_transactions**: Secure payments
- **certificates**: Smart QR certificates
- **virtual_lab_sessions**: Real-time collaboration
- **ai_debugger_logs**: AI assistance tracking

### Status Workflows
```
Projects: PENDING → ACTIVE → PURCHASED → IN_PROGRESS → COMPLETED
Centers: PENDING_APPROVAL → APPROVED
Escrow: HELD → RELEASED
```

## 🚧 Future Enhancements

- [ ] Mobile apps (React Native)
- [ ] Advanced analytics dashboard
- [ ] Automated testing suite
- [ ] Blockchain certificate verification
- [ ] Multi-language support
- [ ] Payment gateway integration (Stripe/PayPal)
- [ ] Advanced AI tutoring features
- [ ] Video conferencing integration

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 💬 Support

For issues and questions:
- GitHub Issues: [Report Bug](https://github.com/muhammadmusammil01-byte/Aegis/issues)
- Email: support@nexushub.com

---

**Built with ❤️ for the next generation of learners**
