# NexusHub - Project Folder Structure

```
NexusHub/
├── config/
│   ├── database.js          # PostgreSQL connection
│   ├── jwt.js               # JWT configuration
│   └── socketio.js          # Socket.io configuration
│
├── middleware/
│   ├── auth.js              # JWT authentication
│   ├── rbac.js              # Role-based access control
│   └── rateLimiter.js       # API rate limiting
│
├── models/
│   ├── User.js              # User model (4 roles)
│   ├── Center.js            # Center/Institution model
│   ├── Project.js           # Project/Idea model
│   ├── Mentor.js            # Mentor profile
│   ├── StudentGroup.js      # Student group (3 members)
│   ├── Escrow.js            # Escrow transactions
│   ├── Certificate.js       # Smart QR Certificates
│   └── VirtualLab.js        # Lab sessions
│
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── systemAdmin.js       # System Admin routes
│   ├── centerAdmin.js       # Center Admin routes
│   ├── mentor.js            # Mentor routes
│   ├── student.js           # Student routes
│   ├── marketplace.js       # Public marketplace
│   ├── escrow.js            # Escrow management
│   └── virtualLab.js        # Virtual Lab WebSocket routes
│
├── services/
│   ├── authService.js       # Authentication logic
│   ├── escrowService.js     # Escrow payment handling
│   ├── certificateService.js # QR Certificate generation
│   ├── aiDebugger.js        # Gemini API integration
│   ├── watermarkService.js  # Dynamic watermarking
│   └── contentShield.js     # Anti-theft protection
│
├── sockets/
│   ├── virtualLab.js        # WebSocket handlers for Virtual Lab
│   └── codeSync.js          # Mentor-Student code mirroring
│
├── public/
│   ├── css/
│   │   ├── glassmorphic.css # Glassmorphic UI framework
│   │   ├── dashboard.css    # Dashboard styling
│   │   └── components.css   # Reusable components
│   │
│   ├── js/
│   │   ├── auth.js          # Client-side authentication
│   │   ├── contentShield.js # Anti-copy/watermark scripts
│   │   ├── marketplace.js   # Marketplace interactions
│   │   ├── escrow.js        # Escrow payment UI
│   │   ├── virtualLab.js    # WebSocket client
│   │   └── aiDebugger.js    # AI Debugger UI
│   │
│   ├── pages/
│   │   ├── index.html           # Landing page
│   │   ├── login.html           # Login page
│   │   ├── marketplace.html     # Public marketplace
│   │   ├── project-view.html    # Protected project view (Content Shield)
│   │   │
│   │   ├── system-admin/
│   │   │   ├── dashboard.html   # Admin dashboard
│   │   │   ├── approve-centers.html # Center approval queue
│   │   │   ├── escrow-vault.html    # Escrow management
│   │   │   └── analytics.html       # Platform analytics
│   │   │
│   │   ├── center-admin/
│   │   │   ├── dashboard.html       # Center dashboard
│   │   │   ├── projects.html        # Manage showcase projects
│   │   │   ├── mentors.html         # Manage mentors
│   │   │   └── certificates.html    # Issue certificates
│   │   │
│   │   ├── mentor/
│   │   │   ├── dashboard.html       # Mentor dashboard
│   │   │   ├── sessions.html        # Shadow coding sessions
│   │   │   ├── virtual-lab.html     # Collaborative workspace
│   │   │   └── milestones.html      # Student milestone approvals
│   │   │
│   │   └── student/
│   │       ├── dashboard.html       # Student dashboard
│   │       ├── group-manager.html   # Form/manage groups
│   │       ├── projects.html        # Browse/purchase projects
│   │       ├── virtual-lab.html     # Collaborative workspace (view)
│   │       └── certificates.html    # View certificates
│   │
│   └── assets/
│       ├── images/
│       └── icons/
│
├── database/
│   ├── schema.sql           # PostgreSQL schema
│   ├── migrations/          # Database migrations
│   └── seeds/               # Seed data
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── uploads/                 # User uploads
├── certificates/            # Generated certificates
├── logs/                    # Application logs
│
├── app.js                   # Main server entry point
├── package.json             # Dependencies
├── .env.example             # Environment template
├── .gitignore              # Git ignore rules
└── README.md               # Documentation
```

## Key Architecture Points

### 4-Role Hierarchy (RBAC)
1. **System Admin** - Approves centers, manages escrow vault
2. **Center Admin** - Uploads projects, manages mentors
3. **Mentor** - Conducts sessions, approves milestones
4. **Student** - Forms groups, pays into escrow, collaborates

### Core Feature Implementation

#### 1. Marketplace with Content Shield
- Location: `public/pages/project-view.html` + `public/js/contentShield.js`
- Features: Disable right-click, prevent copy-paste, dynamic watermark (IP/Email)

#### 2. Escrow System
- Location: `services/escrowService.js` + `routes/escrow.js`
- Logic: Funds held until Smart QR Certificate issued by Center Admin

#### 3. Virtual Lab
- Location: `sockets/virtualLab.js` + `public/pages/*/virtual-lab.html`
- Features: Mentor code editor mirrored to students via WebSocket

#### 4. AI Debugger
- Location: `services/aiDebugger.js`
- Integration: Gemini API to detect errors against mentor's logic

### Tech Stack
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Real-time**: Socket.io
- **Frontend**: HTML5 + Tailwind CSS + Vanilla JavaScript
- **Auth**: JWT tokens
- **AI**: Google Gemini API
