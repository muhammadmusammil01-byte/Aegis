/**
 * Virtual Lab WebSocket Handler
 */

module.exports = (io) => {
  const labNamespace = io.of('/virtual-lab');
  
  // Store active sessions
  const activeSessions = new Map();
  
  labNamespace.on('connection', (socket) => {
    console.log(`Virtual Lab: Client connected ${socket.id}`);
    
    // Join a lab session
    socket.on('join-session', (data) => {
      const { sessionId, userId, role } = data;
      
      socket.join(sessionId);
      socket.sessionId = sessionId;
      socket.userId = userId;
      socket.userRole = role;
      
      console.log(`User ${userId} (${role}) joined session ${sessionId}`);
      
      // Notify others in the session
      socket.to(sessionId).emit('user-joined', {
        userId,
        role
      });
    });
    
    // Mentor code sync
    socket.on('mentor-code-update', (data) => {
      const { sessionId, code, language } = data;
      
      // Broadcast to all students in the session
      socket.to(sessionId).emit('code-sync', {
        code,
        language,
        timestamp: Date.now()
      });
      
      console.log(`Code synced in session ${sessionId}`);
    });
    
    // Student requests help
    socket.on('request-help', (data) => {
      const { sessionId, studentCode, error } = data;
      
      // Notify mentor
      socket.to(sessionId).emit('help-requested', {
        userId: socket.userId,
        studentCode,
        error
      });
    });
    
    // Disconnect
    socket.on('disconnect', () => {
      console.log(`Virtual Lab: Client disconnected ${socket.id}`);
      
      if (socket.sessionId) {
        socket.to(socket.sessionId).emit('user-left', {
          userId: socket.userId,
          role: socket.userRole
        });
      }
    });
  });
};
