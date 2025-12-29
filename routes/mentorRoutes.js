const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

// Get assigned groups
router.get('/my-groups', async (req, res) => {
  try {
    const mentorId = req.user.userId;

    // Get mentor record
    const mentorRecord = await query(
      'SELECT mentor_id, center_id FROM mentors WHERE user_id = $1',
      [mentorId]
    );

    if (mentorRecord.rows.length === 0) {
      return res.status(404).json({ error: 'Mentor profile not found' });
    }

    // Get groups for projects from mentor's center
    const result = await query(
      `SELECT 
        sg.*,
        p.title as project_title,
        p.tech_stack,
        ARRAY_AGG(u.full_name) as student_names
      FROM student_groups sg
      JOIN project_showcases p ON sg.project_id = p.project_id
      JOIN student_group_members sgm ON sg.group_id = sgm.group_id
      JOIN users u ON sgm.user_id = u.user_id
      WHERE p.center_id = $1 AND sg.status IN ('active', 'completed')
      GROUP BY sg.group_id, p.title, p.tech_stack
      ORDER BY sg.created_at DESC`,
      [mentorRecord.rows[0].center_id]
    );

    res.json({ groups: result.rows });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Failed to fetch groups', details: error.message });
  }
});

// Get milestones for a group
router.get('/groups/:groupId/milestones', async (req, res) => {
  try {
    const { groupId } = req.params;

    const result = await query(
      `SELECT * FROM milestone_approvals
       WHERE group_id = $1
       ORDER BY submission_date DESC`,
      [groupId]
    );

    res.json({ milestones: result.rows });
  } catch (error) {
    console.error('Get milestones error:', error);
    res.status(500).json({ error: 'Failed to fetch milestones', details: error.message });
  }
});

// Approve milestone
router.post('/milestones/:approvalId/approve', async (req, res) => {
  try {
    const mentorId = req.user.userId;
    const { approvalId } = req.params;
    const { feedback, approvalPercentage } = req.body;

    // Get mentor record
    const mentorRecord = await query(
      'SELECT mentor_id FROM mentors WHERE user_id = $1',
      [mentorId]
    );

    if (mentorRecord.rows.length === 0) {
      return res.status(404).json({ error: 'Mentor profile not found' });
    }

    const result = await query(
      `UPDATE milestone_approvals
       SET status = 'approved',
           review_date = CURRENT_TIMESTAMP,
           mentor_id = $1,
           mentor_feedback = $2,
           approval_percentage = $3
       WHERE approval_id = $4
       RETURNING *`,
      [mentorRecord.rows[0].mentor_id, feedback, approvalPercentage, approvalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    res.json({ 
      message: 'Milestone approved successfully',
      milestone: result.rows[0]
    });
  } catch (error) {
    console.error('Approve milestone error:', error);
    res.status(500).json({ error: 'Failed to approve milestone', details: error.message });
  }
});

// Reject milestone
router.post('/milestones/:approvalId/reject', async (req, res) => {
  try {
    const mentorId = req.user.userId;
    const { approvalId } = req.params;
    const { feedback } = req.body;

    // Get mentor record
    const mentorRecord = await query(
      'SELECT mentor_id FROM mentors WHERE user_id = $1',
      [mentorId]
    );

    if (mentorRecord.rows.length === 0) {
      return res.status(404).json({ error: 'Mentor profile not found' });
    }

    const result = await query(
      `UPDATE milestone_approvals
       SET status = 'rejected',
           review_date = CURRENT_TIMESTAMP,
           mentor_id = $1,
           mentor_feedback = $2
       WHERE approval_id = $3
       RETURNING *`,
      [mentorRecord.rows[0].mentor_id, feedback, approvalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    res.json({ 
      message: 'Milestone rejected',
      milestone: result.rows[0]
    });
  } catch (error) {
    console.error('Reject milestone error:', error);
    res.status(500).json({ error: 'Failed to reject milestone', details: error.message });
  }
});

// Request revision
router.post('/milestones/:approvalId/revision', async (req, res) => {
  try {
    const mentorId = req.user.userId;
    const { approvalId } = req.params;
    const { feedback } = req.body;

    // Get mentor record
    const mentorRecord = await query(
      'SELECT mentor_id FROM mentors WHERE user_id = $1',
      [mentorId]
    );

    if (mentorRecord.rows.length === 0) {
      return res.status(404).json({ error: 'Mentor profile not found' });
    }

    const result = await query(
      `UPDATE milestone_approvals
       SET status = 'revision_required',
           review_date = CURRENT_TIMESTAMP,
           mentor_id = $1,
           mentor_feedback = $2
       WHERE approval_id = $3
       RETURNING *`,
      [mentorRecord.rows[0].mentor_id, feedback, approvalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    res.json({ 
      message: 'Revision requested',
      milestone: result.rows[0]
    });
  } catch (error) {
    console.error('Request revision error:', error);
    res.status(500).json({ error: 'Failed to request revision', details: error.message });
  }
});

// Get session history
router.get('/sessions', async (req, res) => {
  try {
    const mentorId = req.user.userId;

    // Get mentor record
    const mentorRecord = await query(
      'SELECT mentor_id FROM mentors WHERE user_id = $1',
      [mentorId]
    );

    if (mentorRecord.rows.length === 0) {
      return res.status(404).json({ error: 'Mentor profile not found' });
    }

    const result = await query(
      `SELECT 
        sr.*,
        sg.group_name
      FROM session_recordings sr
      JOIN student_groups sg ON sr.group_id = sg.group_id
      WHERE sr.mentor_id = $1
      ORDER BY sr.started_at DESC`,
      [mentorRecord.rows[0].mentor_id]
    );

    res.json({ sessions: result.rows });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions', details: error.message });
  }
});

// Create session recording
router.post('/sessions', async (req, res) => {
  try {
    const mentorId = req.user.userId;
    const { groupId, sessionTitle, sessionType, codeSnapshot } = req.body;

    // Get mentor record
    const mentorRecord = await query(
      'SELECT mentor_id FROM mentors WHERE user_id = $1',
      [mentorId]
    );

    if (mentorRecord.rows.length === 0) {
      return res.status(404).json({ error: 'Mentor profile not found' });
    }

    const result = await query(
      `INSERT INTO session_recordings (
        group_id, mentor_id, session_title, session_type, code_snapshot
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [groupId, mentorRecord.rows[0].mentor_id, sessionTitle, sessionType, codeSnapshot]
    );

    res.status(201).json({ 
      message: 'Session created successfully',
      session: result.rows[0]
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session', details: error.message });
  }
});

// End session
router.put('/sessions/:sessionId/end', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { codeSnapshot } = req.body;

    const result = await query(
      `UPDATE session_recordings
       SET ended_at = CURRENT_TIMESTAMP,
           duration_minutes = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at)) / 60,
           code_snapshot = COALESCE($1, code_snapshot)
       WHERE recording_id = $2
       RETURNING *`,
      [codeSnapshot, sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ 
      message: 'Session ended successfully',
      session: result.rows[0]
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Failed to end session', details: error.message });
  }
});

module.exports = router;
