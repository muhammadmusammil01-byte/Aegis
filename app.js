/**
 * NexusHub - AI-Powered Project Incubation & Escrow Marketplace
 * Main Server Entry Point
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

// Configuration imports
const db = require('./config/database');
const jwtConfig = require('./config/jwt');

// Middleware imports
const { authenticateJWT, authorizeRoles } = require('./middleware/rbac');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');

// Route imports
const authRoutes = require('./routes/nexus/auth');
const marketplaceRoutes = require('./routes/nexus/marketplace');
const escrowRoutes = require('./routes/nexus/escrow');
const systemAdminRoutes = require('./routes/nexus/systemAdmin');
const centerAdminRoutes = require('./routes/nexus/centerAdmin');
const mentorRoutes = require('./routes/nexus/mentor');
const studentRoutes = require('./routes/nexus/student');

// Socket handlers
const virtualLabSocket = require('./sockets/virtualLab');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Apply general rate limiting to all API routes
app.use('/api/', apiLimiter);

// Static files - serve from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Request logging middleware (development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// DATABASE CONNECTION
// ============================================

db.connect()
  .then(() => console.log('✓ Connected to PostgreSQL database'))
  .catch(err => {
    console.error('✗ Database connection failed:', err.message);
    process.exit(1);
  });

// ============================================
// SOCKET.IO CONFIGURATION
// ============================================

// Store Socket.io instance for use in routes
app.set('io', io);

// Virtual Lab WebSocket handlers
virtualLabSocket(io);

io.on('connection', (socket) => {
  console.log(`✓ Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`✗ Client disconnected: ${socket.id}`);
  });
});

// ============================================
// API ROUTES
// ============================================

// Public routes (no authentication required)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/marketplace', marketplaceRoutes);

// Protected routes (authentication required, role-based)
app.use('/api/escrow', authenticateJWT, escrowRoutes);

// System Admin routes (SYSTEM_ADMIN only)
app.use('/api/system-admin', 
  authenticateJWT, 
  authorizeRoles('SYSTEM_ADMIN'), 
  systemAdminRoutes
);

// Center Admin routes (CENTER_ADMIN only)
app.use('/api/center-admin', 
  authenticateJWT, 
  authorizeRoles('CENTER_ADMIN'), 
  centerAdminRoutes
);

// Mentor routes (MENTOR only)
app.use('/api/mentor', 
  authenticateJWT, 
  authorizeRoles('MENTOR'), 
  mentorRoutes
);

// Student routes (STUDENT only)
app.use('/api/student', 
  authenticateJWT, 
  authorizeRoles('STUDENT'), 
  studentRoutes
);

// ============================================
// ROLE-BASED DASHBOARD ROUTING
// ============================================

// Middleware to redirect users to their role-specific dashboard
const redirectToDashboard = authenticateJWT;

// Protected dashboard routes - serve appropriate HTML based on role
app.get('/dashboard', redirectToDashboard, (req, res) => {
  const role = req.user.role;
  
  switch(role) {
    case 'SYSTEM_ADMIN':
      res.sendFile(path.join(__dirname, 'public/pages/system-admin/dashboard.html'));
      break;
    case 'CENTER_ADMIN':
      res.sendFile(path.join(__dirname, 'public/pages/center-admin/dashboard.html'));
      break;
    case 'MENTOR':
      res.sendFile(path.join(__dirname, 'public/pages/mentor/dashboard.html'));
      break;
    case 'STUDENT':
      res.sendFile(path.join(__dirname, 'public/pages/student/dashboard.html'));
      break;
    default:
      res.status(403).json({ error: 'Invalid role' });
  }
});

// ============================================
// STATIC PAGE ROUTES
// ============================================

// Landing page (public)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/index.html'));
});

// Login page (public)
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/login.html'));
});

// Marketplace (public)
app.get('/marketplace', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/marketplace.html'));
});

// Protected Project View with Content Shield
app.get('/project/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/project-view.html'));
});

// ============================================
// HEALTH CHECK & STATUS
// ============================================

app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await db.checkHealth();
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'NexusHub',
      database: dbHealth ? 'Connected' : 'Disconnected',
      version: '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      service: 'NexusHub',
      error: error.message
    });
  }
});

// API info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    name: 'NexusHub API',
    version: '1.0.0',
    description: 'AI-Powered Project Incubation & Escrow Marketplace',
    roles: ['SYSTEM_ADMIN', 'CENTER_ADMIN', 'MENTOR', 'STUDENT'],
    features: [
      'Marketplace with Content Shield',
      'Escrow Payment System',
      'Virtual Lab with WebSocket',
      'AI Debugger (Gemini API)',
      'Smart QR Certificates'
    ]
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// SERVER STARTUP
// ============================================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 NexusHub Server Started');
  console.log('='.repeat(60));
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✓ Server running on: http://localhost:${PORT}`);
  console.log(`✓ API available at: http://localhost:${PORT}/api`);
  console.log(`✓ Health check: http://localhost:${PORT}/api/health`);
  console.log(`✓ WebSocket enabled for Virtual Lab`);
  console.log('='.repeat(60));
  console.log('📋 Role-Based Access:');
  console.log('   • System Admin: /api/system-admin/*');
  console.log('   • Center Admin: /api/center-admin/*');
  console.log('   • Mentor: /api/mentor/*');
  console.log('   • Student: /api/student/*');
  console.log('='.repeat(60));
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = async () => {
  console.log('\n⚠️  Shutting down gracefully...');
  
  server.close(async () => {
    console.log('✓ HTTP server closed');
    
    try {
      await db.disconnect();
      console.log('✓ Database connection closed');
      process.exit(0);
    } catch (error) {
      console.error('✗ Error during shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

module.exports = { app, server, io };
