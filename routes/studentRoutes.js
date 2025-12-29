const express = require('express');
const router = express.Router();
const { query, getClient } = require('../config/database');

// Create or join a group
router.post('/groups', async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const studentId = req.user.userId;
    const { groupName, projectId, isLeader } = req.body;

    if (isLeader) {
      // Create new group
      const groupResult = await client.query(
        `INSERT INTO student_groups (group_name, project_id, leader_id, status)
         VALUES ($1, $2, $3, 'forming')
         RETURNING *`,
        [groupName, projectId, studentId]
      );

      const group = groupResult.rows[0];

      // Add leader as first member
      await client.query(
        `INSERT INTO student_group_members (group_id, user_id, role_in_group)
         VALUES ($1, $2, 'leader')`,
        [group.group_id, studentId]
      );

      await client.query('COMMIT');

      res.status(201).json({ 
        message: 'Group created successfully',
        group: group
      });
    } else {
      return res.status(400).json({ error: 'Please specify if creating or joining a group' });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Failed to create group', details: error.message });
  } finally {
    client.release();
  }
});

// Join existing group
router.post('/groups/:groupId/join', async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const studentId = req.user.userId;
    const { groupId } = req.params;

    // Check current member count
    const countResult = await client.query(
      'SELECT COUNT(*) as member_count FROM student_group_members WHERE group_id = $1',
      [groupId]
    );

    const memberCount = parseInt(countResult.rows[0].member_count);

    if (memberCount >= 3) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Group is full. Maximum 3 members allowed.' });
    }

    // Check if already a member
    const existingMember = await client.query(
      'SELECT member_id FROM student_group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, studentId]
    );

    if (existingMember.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'You are already a member of this group' });
    }

    // Add member
    await client.query(
      `INSERT INTO student_group_members (group_id, user_id, role_in_group)
       VALUES ($1, $2, 'member')`,
      [groupId, studentId]
    );

    // If group now has 3 members, activate it
    if (memberCount + 1 === 3) {
      await client.query(
        `UPDATE student_groups SET status = 'active' WHERE group_id = $1`,
        [groupId]
      );
    }

    await client.query('COMMIT');

    res.json({ message: 'Successfully joined the group' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Join group error:', error);
    res.status(500).json({ error: 'Failed to join group', details: error.message });
  } finally {
    client.release();
  }
});

// Get my groups
router.get('/my-groups', async (req, res) => {
  try {
    const studentId = req.user.userId;

    const result = await query(
      `SELECT 
        sg.*,
        p.title as project_title,
        p.price,
        p.tech_stack,
        ARRAY_AGG(u.full_name) as member_names,
        COUNT(sgm.member_id) as member_count
      FROM student_groups sg
      JOIN student_group_members sgm ON sg.group_id = sgm.group_id
      LEFT JOIN project_showcases p ON sg.project_id = p.project_id
      LEFT JOIN users u ON sgm.user_id = u.user_id
      WHERE sg.group_id IN (
        SELECT group_id FROM student_group_members WHERE user_id = $1
      )
      GROUP BY sg.group_id, p.title, p.price, p.tech_stack
      ORDER BY sg.created_at DESC`,
      [studentId]
    );

    res.json({ groups: result.rows });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Failed to fetch groups', details: error.message });
  }
});

// Submit milestone
router.post('/milestones', async (req, res) => {
  try {
    const { groupId, milestoneTitle, milestoneDescription } = req.body;
    const studentId = req.user.userId;

    // Verify student is in the group
    const memberCheck = await query(
      'SELECT member_id FROM student_group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, studentId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const result = await query(
      `INSERT INTO milestone_approvals (group_id, milestone_title, milestone_description, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [groupId, milestoneTitle, milestoneDescription]
    );

    res.status(201).json({ 
      message: 'Milestone submitted for review',
      milestone: result.rows[0]
    });
  } catch (error) {
    console.error('Submit milestone error:', error);
    res.status(500).json({ error: 'Failed to submit milestone', details: error.message });
  }
});

// Get milestones for my groups
router.get('/milestones', async (req, res) => {
  try {
    const studentId = req.user.userId;

    const result = await query(
      `SELECT 
        ma.*,
        sg.group_name
      FROM milestone_approvals ma
      JOIN student_groups sg ON ma.group_id = sg.group_id
      WHERE sg.group_id IN (
        SELECT group_id FROM student_group_members WHERE user_id = $1
      )
      ORDER BY ma.submission_date DESC`,
      [studentId]
    );

    res.json({ milestones: result.rows });
  } catch (error) {
    console.error('Get milestones error:', error);
    res.status(500).json({ error: 'Failed to fetch milestones', details: error.message });
  }
});

// Make payment (initiate escrow)
router.post('/payments', async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const studentId = req.user.userId;
    const { groupId, projectId, amount, paymentMethod, paymentReference } = req.body;

    // Verify student is leader of the group
    const groupCheck = await client.query(
      'SELECT leader_id FROM student_groups WHERE group_id = $1',
      [groupId]
    );

    if (groupCheck.rows.length === 0 || groupCheck.rows[0].leader_id !== studentId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only group leader can make payment' });
    }

    // Get center from project
    const projectCheck = await client.query(
      'SELECT center_id FROM project_showcases WHERE project_id = $1',
      [projectId]
    );

    if (projectCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Project not found' });
    }

    // Create escrow transaction
    const result = await client.query(
      `INSERT INTO escrow_transactions (
        group_id, project_id, center_id, amount, status,
        payment_method, payment_reference, held_at
      ) VALUES ($1, $2, $3, $4, 'held', $5, $6, CURRENT_TIMESTAMP)
      RETURNING *`,
      [groupId, projectId, projectCheck.rows[0].center_id, amount, paymentMethod, paymentReference]
    );

    // Update project purchase count
    await client.query(
      'UPDATE project_showcases SET purchases_count = purchases_count + 1 WHERE project_id = $1',
      [projectId]
    );

    await client.query('COMMIT');

    res.status(201).json({ 
      message: 'Payment successful. Funds held in escrow.',
      transaction: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Payment error:', error);
    res.status(500).json({ error: 'Payment failed', details: error.message });
  } finally {
    client.release();
  }
});

// Get payment status
router.get('/payments/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const studentId = req.user.userId;

    // Verify student is in the group
    const memberCheck = await query(
      'SELECT member_id FROM student_group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, studentId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const result = await query(
      `SELECT * FROM escrow_transactions WHERE group_id = $1 ORDER BY created_at DESC`,
      [groupId]
    );

    res.json({ transactions: result.rows });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payment status', details: error.message });
  }
});

// Get certificates
router.get('/certificates', async (req, res) => {
  try {
    const studentId = req.user.userId;

    const result = await query(
      `SELECT 
        c.*,
        sg.group_name,
        p.title as project_title
      FROM certificates c
      JOIN student_groups sg ON c.group_id = sg.group_id
      LEFT JOIN project_showcases p ON c.project_id = p.project_id
      WHERE sg.group_id IN (
        SELECT group_id FROM student_group_members WHERE user_id = $1
      )
      ORDER BY c.issue_date DESC`,
      [studentId]
    );

    res.json({ certificates: result.rows });
  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({ error: 'Failed to fetch certificates', details: error.message });
  }
});

module.exports = router;
