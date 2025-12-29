# 🚀 NexusHub - AI-Powered Project Incubation & Escrow Marketplace

> A multi-tenant platform where students discover project ideas, collaborate with mentors, and get paid safely through an escrow-protected system.

## 🎯 Project Overview

**NexusHub** is a comprehensive full-stack platform that connects students with verified training centers for real-world project incubation. The platform features:

- **4-Role RBAC**: System Admin, Center Admin, Mentor, Student
- **Escrow Protection**: Funds held securely until project completion
- **Real-Time Virtual Lab**: Shadow coding with WebSocket-powered code mirroring
- **AI Debugging**: Gemini API integration for intelligent code comparison
- **Smart QR Certificates**: Blockchain-ready verification triggering fund release

## 🏗️ Technology Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL 14+
- **Real-Time**: Socket.io for WebSocket connections
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcrypt for password hashing

### Frontend
- **Framework**: Vanilla JavaScript (no frameworks)
- **Styling**: Tailwind CSS with Glassmorphic UI
- **Real-Time**: Socket.io client
- **Security**: Content Shield (anti-copy protection)

## 📁 Project Structure

```
NexusHub/
├── app.js                      # Main server entry point
├── package.json                # Dependencies
├── .env.example                # Environment variables template
│
├── config/
│   └── database.js             # PostgreSQL connection pool
│
├── database/
│   └── schema.sql              # Complete database schema
│
├── middleware/
│   └── authMiddleware.js       # JWT authentication & role checking
│
├── routes/
│   ├── authRoutes.js           # Login, register, get user
│   ├── marketplaceRoutes.js    # Public project browsing
│   ├── systemAdminRoutes.js    # Center approvals, escrow vault
│   ├── centerAdminRoutes.js    # Project uploads, mentor mgmt
│   ├── mentorRoutes.js         # Milestone approvals, sessions
│   ├── studentRoutes.js        # Groups, payments, certificates
│   └── escrowRoutes.js         # Transaction queries
│
├── websocket/
│   └── virtualLab.js           # Real-time code mirroring
│
└── public/
    ├── nexushub-index.html          # Landing page
    ├── nexushub-marketplace.html    # Protected marketplace
    ├── login.html                   # Authentication
    ├── register.html                # User registration
    └── dashboards/
        ├── system-admin.html        # Admin dashboard
        ├── center-admin.html        # Center dashboard
        ├── mentor.html              # Mentor dashboard
        └── student.html             # Student dashboard with Virtual Lab
```

## 🚀 Quick Start

### Prerequisites
- Node.js 14+
- PostgreSQL 14+
- npm or yarn

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
psql -U postgres -d nexushub -f database/schema.sql
```

4. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your database credentials
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
http://localhost:3000
```

## 🔑 Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nexushub
DB_USER=postgres
DB_PASSWORD=your_password

# Server
PORT=3000
NODE_ENV=development
APP_URL=http://localhost:3000

# Security
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h
SESSION_SECRET=your_session_secret_here

# AI Integration
GEMINI_API_KEY=your_gemini_api_key_here
```

## 👥 User Roles & Workflows

### 1. System Admin
**Responsibilities:**
- Approve/reject center registrations
- Manage escrow vault (hold/release funds)
- Monitor platform statistics
- Manage user accounts

**Key Routes:**
- `GET /api/system-admin/centers/pending` - View pending centers
- `POST /api/system-admin/centers/:id/approve` - Approve center
- `GET /api/system-admin/escrow/vault` - View escrow transactions
- `POST /api/system-admin/escrow/:id/release` - Release funds

### 2. Center Admin
**Responsibilities:**
- Upload project showcases
- Manage mentors
- Issue Smart QR Certificates (triggers fund release)

**Key Routes:**
- `POST /api/center-admin/projects` - Upload project
- `POST /api/center-admin/mentors` - Add mentor
- `POST /api/center-admin/certificates` - Issue certificate

### 3. Mentor
**Responsibilities:**
- Conduct shadow coding sessions
- Approve student milestones
- Mirror code in real-time to students

**Key Routes:**
- `GET /api/mentor/my-groups` - View assigned groups
- `POST /api/mentor/milestones/:id/approve` - Approve milestone
- `POST /api/mentor/sessions` - Create session

**WebSocket Events:**
- `mentor-code-update` - Share code with students

### 4. Student
**Responsibilities:**
- Form groups of 3 members
- Pay for projects (funds go to escrow)
- Collaborate in Virtual Lab
- Receive certificates upon completion

**Key Routes:**
- `POST /api/student/groups` - Create group
- `POST /api/student/groups/:id/join` - Join group
- `POST /api/student/payments` - Make payment (escrow)
- `GET /api/student/certificates` - View certificates

**WebSocket Events:**
- `code-mirror` - Receive mentor's code
- `student-code-submit` - Submit for AI debugging

## 🔒 Security Features

### Content Shield (Marketplace)
- **Disable right-click**: Prevents context menu access
- **Prevent copy/paste**: Blocks Ctrl+C, Ctrl+V
- **Dynamic watermark**: User's email/IP overlaid on content
- **Keyboard shortcuts blocked**: F12, Ctrl+Shift+I, Ctrl+U disabled

### Authentication
- **JWT tokens**: Secure stateless authentication
- **Role-based access**: Middleware enforces permissions
- **Password hashing**: bcrypt with salt rounds
- **Session management**: Express sessions with secure cookies

## 💰 Escrow System Flow

1. **Student pays** → Funds held in escrow (status: `held`)
2. **Student completes project** → Submits milestones
3. **Mentor approves** → Reviews and approves work
4. **Center issues Smart QR Certificate** → Triggers release eligibility
5. **System Admin releases funds** → Funds transferred to center

```sql
-- Escrow states
'pending' → 'held' → 'released'
```

## 🤖 AI Debugger (Gemini API)

**How it works:**
1. Mentor shares reference code in Virtual Lab
2. Student writes their own implementation
3. Student submits code for AI debugging
4. Gemini API compares student vs mentor logic
5. AI suggests improvements and error fixes

**Example Response:**
```json
{
  "errorDetected": "Logic mismatch in loop condition",
  "aiSuggestion": "Consider using <= instead of < to match mentor's implementation",
  "errorType": "logic_error",
  "confidence": 0.85
}
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT
- `GET /api/auth/me` - Get current user info

### Marketplace (Public)
- `GET /api/marketplace/projects` - Browse projects
- `GET /api/marketplace/projects/:id` - Project details
- `GET /api/marketplace/search?q=keyword` - Search projects

### Protected Routes
All role-based routes require `Authorization: Bearer <token>` header.

## 🎨 Frontend Features

### Glassmorphic UI
- Transparent glass-like cards
- Backdrop blur effects
- High-contrast gradients
- Responsive design

### Virtual Lab (Real-Time)
- Code mirroring from mentor to students
- Syntax highlighting
- Chat functionality
- Cursor position tracking

## 🧪 Testing

### Manual Testing Steps

1. **Register as System Admin**
```bash
# Update seed data in schema.sql with real password hash
```

2. **Register as Center Admin**
```
POST /api/auth/register
{
  "email": "center@example.com",
  "password": "password123",
  "fullName": "Test Center",
  "role": "center_admin"
}
```

3. **Approve Center**
- Login as System Admin
- Navigate to Center Approvals
- Click Approve

4. **Test Escrow Flow**
- Register as Student
- Create group
- Make payment
- Verify escrow status

5. **Test Virtual Lab**
- Register as Mentor
- Start session
- Students join via WebSocket
- Share code in real-time

## 📊 Database Schema Highlights

### Key Tables
- `users` - 4-role RBAC (system_admin, center_admin, mentor, student)
- `centers` - Training centers with approval workflow
- `project_showcases` - Projects offered by centers
- `student_groups` - Groups of 3 students
- `escrow_transactions` - Fund holding and release
- `certificates` - Smart QR certificates
- `ai_debug_sessions` - AI debugging history
- `session_recordings` - Shadow coding sessions

### Triggers
- Auto-update `updated_at` timestamp on all tables

## 🚧 Future Enhancements

- [ ] Payment gateway integration (Stripe/PayPal)
- [ ] Video conferencing in Virtual Lab
- [ ] Mobile responsive dashboards
- [ ] Advanced analytics for centers
- [ ] Blockchain certificate verification
- [ ] Multi-language support
- [ ] Automated testing suite

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📧 Support

For issues and questions:
- GitHub Issues
- Pull Requests welcome

---

**Built with ❤️ for the next generation of developers**
