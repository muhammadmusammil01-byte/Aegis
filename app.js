require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const session = require('express-session');

// Import database
const { pool } = require('./config/database');

// Import middleware
const { authenticateToken, checkRole } = require('./middleware/authMiddleware');

// Import routes (will be created)
const authRoutes = require('./routes/authRoutes');
const systemAdminRoutes = require('./routes/systemAdminRoutes');
const centerAdminRoutes = require('./routes/centerAdminRoutes');
const mentorRoutes = require('./routes/mentorRoutes');
const studentRoutes = require('./routes/studentRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');
const escrowRoutes = require('./routes/escrowRoutes');

// Import WebSocket handlers
const { initializeWebSocket } = require('./websocket/virtualLab');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'nexushub-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static files with security headers
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filepath) => {
    // Add security headers for static content
    if (filepath.endsWith('.html')) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval';");
    }
  }
}));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      service: 'NexusHub Platform',
      database: 'Connected'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'Error', 
      timestamp: new Date().toISOString(),
      service: 'NexusHub Platform',
      database: 'Disconnected'
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/marketplace', marketplaceRoutes);

// Role-based protected routes with JWT authentication
app.use('/api/system-admin', authenticateToken, checkRole(['system_admin']), systemAdminRoutes);
app.use('/api/center-admin', authenticateToken, checkRole(['center_admin']), centerAdminRoutes);
app.use('/api/mentor', authenticateToken, checkRole(['mentor']), mentorRoutes);
app.use('/api/student', authenticateToken, checkRole(['student']), studentRoutes);
app.use('/api/escrow', authenticateToken, escrowRoutes);

// Root endpoint - serves landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Role-based dashboard redirects (after login)
app.get('/dashboard', authenticateToken, (req, res) => {
  const role = req.user.role;
  
  switch(role) {
    case 'system_admin':
      res.sendFile(path.join(__dirname, 'public', 'dashboards', 'system-admin.html'));
      break;
    case 'center_admin':
      res.sendFile(path.join(__dirname, 'public', 'dashboards', 'center-admin.html'));
      break;
    case 'mentor':
      res.sendFile(path.join(__dirname, 'public', 'dashboards', 'mentor.html'));
      break;
    case 'student':
      res.sendFile(path.join(__dirname, 'public', 'dashboards', 'student.html'));
      break;
    default:
      res.status(403).json({ error: 'Invalid role' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({ 
    error: err.message || 'Something went wrong!',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path
  });
});

// Initialize WebSocket for Virtual Lab
initializeWebSocket(io);

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✓ PostgreSQL database connected');
    console.log(`✓ NexusHub Platform server running on port ${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✓ API available at http://localhost:${PORT}/api`);
    console.log(`✓ WebSocket server initialized for Virtual Lab`);
  } catch (error) {
    console.error('✗ Database connection error:', error.message);
    console.error('Please ensure PostgreSQL is running and the database exists');
  }
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('\nShutting down gracefully...');
  
  server.close(() => {
    console.log('✓ HTTP server closed');
  });
  
  await pool.end();
  console.log('✓ Database connections closed');
  
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = { app, io };
