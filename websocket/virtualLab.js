const { verifyToken } = require('../middleware/authMiddleware');
const { query } = require('../config/database');

// Store active sessions
const activeSessions = new Map();

function initializeWebSocket(io) {
  // Virtual Lab namespace for real-time collaboration
  const virtualLabNamespace = io.of('/virtual-lab');

  virtualLabNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = verifyToken(token);
      
      if (!decoded) {
        return next(new Error('Authentication error: Invalid token'));
      }

      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  virtualLabNamespace.on('connection', (socket) => {
    console.log(`User connected to Virtual Lab: ${socket.user.email} (${socket.user.role})`);

    // Join a coding session room
    socket.on('join-session', async (data) => {
      try {
        const { groupId, sessionId } = data;

        // Verify user has access to this group
        const accessCheck = await query(
          `SELECT 1 FROM student_group_members WHERE group_id = $1 AND user_id = $2
           UNION
           SELECT 1 FROM mentors m
           JOIN centers c ON m.center_id = c.center_id
           JOIN project_showcases p ON p.center_id = c.center_id
           JOIN student_groups sg ON sg.project_id = p.project_id
           WHERE sg.group_id = $1 AND m.user_id = $2`,
          [groupId, socket.user.userId]
        );

        if (accessCheck.rows.length === 0) {
          socket.emit('error', { message: 'Access denied to this session' });
          return;
        }

        const roomName = `session-${sessionId}`;
        socket.join(roomName);

        // Track session
        if (!activeSessions.has(sessionId)) {
          activeSessions.set(sessionId, {
            mentorSocket: null,
            students: new Set(),
            currentCode: '',
            cursorPosition: null
          });
        }

        const session = activeSessions.get(sessionId);

        if (socket.user.role === 'mentor') {
          session.mentorSocket = socket.id;
          socket.emit('session-joined', {
            role: 'mentor',
            sessionId,
            studentCount: session.students.size
          });
        } else if (socket.user.role === 'student') {
          session.students.add(socket.id);
          socket.emit('session-joined', {
            role: 'student',
            sessionId,
            currentCode: session.currentCode
          });
        }

        // Notify others in the room
        socket.to(roomName).emit('user-joined', {
          userId: socket.user.userId,
          name: socket.user.fullName,
          role: socket.user.role
        });

        console.log(`User ${socket.user.email} joined session ${sessionId}`);
      } catch (error) {
        console.error('Join session error:', error);
        socket.emit('error', { message: 'Failed to join session' });
      }
    });

    // Mentor shares code (Shadow Coding)
    socket.on('mentor-code-update', (data) => {
      const { sessionId, code, language, cursorPosition } = data;

      if (socket.user.role !== 'mentor') {
        socket.emit('error', { message: 'Only mentors can share code' });
        return;
      }

      const session = activeSessions.get(sessionId);
      if (session) {
        session.currentCode = code;
        session.cursorPosition = cursorPosition;
      }

      const roomName = `session-${sessionId}`;
      
      // Mirror to all students in the session
      socket.to(roomName).emit('code-mirror', {
        code,
        language,
        cursorPosition,
        timestamp: Date.now()
      });
    });

    // Student submits code for AI debugging
    socket.on('student-code-submit', async (data) => {
      try {
        const { sessionId, studentCode, groupId } = data;

        if (socket.user.role !== 'student') {
          socket.emit('error', { message: 'Only students can submit code for debugging' });
          return;
        }

        const session = activeSessions.get(sessionId);
        const mentorCode = session ? session.currentCode : '';

        // Store in database for AI processing
        const result = await query(
          `INSERT INTO ai_debug_sessions (group_id, student_code, mentor_code, created_at)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
           RETURNING session_id`,
          [groupId, studentCode, mentorCode]
        );

        // Emit to request AI debugging (this would trigger Gemini API call)
        socket.emit('ai-debug-requested', {
          aiSessionId: result.rows[0].session_id,
          status: 'processing'
        });

        // In a real implementation, you would call Gemini API here
        // For now, we'll simulate a response
        setTimeout(() => {
          const mockAIResponse = {
            aiSessionId: result.rows[0].session_id,
            errorDetected: 'Logic mismatch in loop condition',
            aiSuggestion: 'Consider using <= instead of < in your for loop to match mentor\'s implementation',
            errorType: 'logic_error',
            confidence: 0.85
          };

          socket.emit('ai-debug-result', mockAIResponse);

          // Store AI response in database
          query(
            `UPDATE ai_debug_sessions 
             SET error_detected = $1, ai_suggestion = $2, error_type = $3
             WHERE session_id = $4`,
            [
              mockAIResponse.errorDetected,
              mockAIResponse.aiSuggestion,
              mockAIResponse.errorType,
              result.rows[0].session_id
            ]
          ).catch(err => console.error('Failed to store AI response:', err));
        }, 2000);

      } catch (error) {
        console.error('Student code submit error:', error);
        socket.emit('error', { message: 'Failed to process code submission' });
      }
    });

    // Real-time chat in session
    socket.on('session-message', (data) => {
      const { sessionId, message } = data;
      const roomName = `session-${sessionId}`;

      socket.to(roomName).emit('session-message', {
        userId: socket.user.userId,
        name: socket.user.fullName,
        role: socket.user.role,
        message,
        timestamp: Date.now()
      });
    });

    // Cursor position tracking
    socket.on('cursor-move', (data) => {
      const { sessionId, line, column } = data;
      const roomName = `session-${sessionId}`;

      socket.to(roomName).emit('cursor-update', {
        userId: socket.user.userId,
        name: socket.user.fullName,
        line,
        column
      });
    });

    // Leave session
    socket.on('leave-session', (data) => {
      const { sessionId } = data;
      const roomName = `session-${sessionId}`;

      socket.leave(roomName);

      const session = activeSessions.get(sessionId);
      if (session) {
        if (socket.user.role === 'mentor' && session.mentorSocket === socket.id) {
          session.mentorSocket = null;
        } else if (socket.user.role === 'student') {
          session.students.delete(socket.id);
        }

        // Clean up empty sessions
        if (!session.mentorSocket && session.students.size === 0) {
          activeSessions.delete(sessionId);
        }
      }

      socket.to(roomName).emit('user-left', {
        userId: socket.user.userId,
        name: socket.user.fullName,
        role: socket.user.role
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected from Virtual Lab: ${socket.user.email}`);

      // Clean up from all sessions
      activeSessions.forEach((session, sessionId) => {
        if (session.mentorSocket === socket.id) {
          session.mentorSocket = null;
          const roomName = `session-${sessionId}`;
          socket.to(roomName).emit('mentor-disconnected', {
            message: 'Mentor has left the session'
          });
        }
        
        if (session.students.has(socket.id)) {
          session.students.delete(socket.id);
        }

        // Clean up empty sessions
        if (!session.mentorSocket && session.students.size === 0) {
          activeSessions.delete(sessionId);
        }
      });
    });
  });

  console.log('✓ Virtual Lab WebSocket initialized');
}

module.exports = { initializeWebSocket };
