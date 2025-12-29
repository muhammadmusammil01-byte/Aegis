const express = require('express');
const router = express.Router();
const { query, getClient } = require('../config/database');

// Get center approval queue
router.get('/centers/pending', async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        c.*,
        u.full_name as admin_name,
        u.email as admin_email,
        u.phone as admin_phone
      FROM centers c
      LEFT JOIN users u ON c.center_admin_id = u.user_id
      WHERE c.status = 'pending'
      ORDER BY c.created_at ASC`
    );

    res.json({ pendingCenters: result.rows });
  } catch (error) {
    console.error('Get pending centers error:', error);
    res.status(500).json({ error: 'Failed to fetch pending centers', details: error.message });
  }
});

// Approve center
router.post('/centers/:centerId/approve', async (req, res) => {
  try {
    const { centerId } = req.params;
    const systemAdminId = req.user.userId;

    const result = await query(
      `UPDATE centers 
       SET status = 'approved', 
           approval_date = CURRENT_TIMESTAMP,
           approved_by = $1
       WHERE center_id = $2 AND status = 'pending'
       RETURNING *`,
      [systemAdminId, centerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Center not found or already processed' });
    }

    res.json({ 
      message: 'Center approved successfully',
      center: result.rows[0]
    });
  } catch (error) {
    console.error('Approve center error:', error);
    res.status(500).json({ error: 'Failed to approve center', details: error.message });
  }
});

// Reject center
router.post('/centers/:centerId/reject', async (req, res) => {
  try {
    const { centerId } = req.params;
    const { reason } = req.body;
    const systemAdminId = req.user.userId;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const result = await query(
      `UPDATE centers 
       SET status = 'rejected', 
           rejection_reason = $1,
           approved_by = $2
       WHERE center_id = $3 AND status = 'pending'
       RETURNING *`,
      [reason, systemAdminId, centerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Center not found or already processed' });
    }

    res.json({ 
      message: 'Center rejected',
      center: result.rows[0]
    });
  } catch (error) {
    console.error('Reject center error:', error);
    res.status(500).json({ error: 'Failed to reject center', details: error.message });
  }
});

// Get escrow vault overview
router.get('/escrow/vault', async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        e.transaction_id,
        e.amount,
        e.status,
        e.held_at,
        e.payment_reference,
        sg.group_name,
        p.title as project_title,
        c.center_name,
        ARRAY_AGG(u.full_name) as student_names
      FROM escrow_transactions e
      JOIN student_groups sg ON e.group_id = sg.group_id
      LEFT JOIN project_showcases p ON e.project_id = p.project_id
      LEFT JOIN centers c ON e.center_id = c.center_id
      LEFT JOIN student_group_members sgm ON sg.group_id = sgm.group_id
      LEFT JOIN users u ON sgm.user_id = u.user_id
      WHERE e.status IN ('pending', 'held')
      GROUP BY e.transaction_id, sg.group_name, p.title, c.center_name
      ORDER BY e.held_at DESC`
    );

    // Calculate total funds held
    const totalResult = await query(
      `SELECT SUM(amount) as total_held 
       FROM escrow_transactions 
       WHERE status = 'held'`
    );

    res.json({ 
      transactions: result.rows,
      totalHeld: totalResult.rows[0].total_held || 0
    });
  } catch (error) {
    console.error('Get escrow vault error:', error);
    res.status(500).json({ error: 'Failed to fetch escrow vault', details: error.message });
  }
});

// Release escrow funds (triggered by certificate)
router.post('/escrow/:transactionId/release', async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const systemAdminId = req.user.userId;
    const { transactionId } = req.params;
    const { certificateId, notes } = req.body;

    // Verify certificate exists
    if (certificateId) {
      const certResult = await client.query(
        'SELECT certificate_id FROM certificates WHERE certificate_id = $1',
        [certificateId]
      );

      if (certResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Certificate not found' });
      }
    }

    // Release funds
    const result = await client.query(
      `UPDATE escrow_transactions 
       SET status = 'released',
           released_at = CURRENT_TIMESTAMP,
           release_trigger = 'smart_qr_certificate',
           certificate_id = $1,
           system_admin_id = $2,
           notes = $3
       WHERE transaction_id = $4 AND status = 'held'
       RETURNING *`,
      [certificateId, systemAdminId, notes, transactionId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Transaction not found or already processed' });
    }

    // Update group status to completed
    await client.query(
      `UPDATE student_groups 
       SET status = 'completed'
       WHERE group_id = $1`,
      [result.rows[0].group_id]
    );

    await client.query('COMMIT');

    res.json({ 
      message: 'Funds released successfully',
      transaction: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Release funds error:', error);
    res.status(500).json({ error: 'Failed to release funds', details: error.message });
  } finally {
    client.release();
  }
});

// Get platform statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
        (SELECT COUNT(*) FROM users WHERE role = 'mentor') as total_mentors,
        (SELECT COUNT(*) FROM centers WHERE status = 'approved') as approved_centers,
        (SELECT COUNT(*) FROM centers WHERE status = 'pending') as pending_centers,
        (SELECT COUNT(*) FROM project_showcases WHERE status = 'active') as active_projects,
        (SELECT COUNT(*) FROM student_groups WHERE status = 'active') as active_groups,
        (SELECT SUM(amount) FROM escrow_transactions WHERE status = 'held') as funds_in_escrow,
        (SELECT SUM(amount) FROM escrow_transactions WHERE status = 'released') as total_released
    `);

    res.json({ stats: stats.rows[0] });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics', details: error.message });
  }
});

// Get all users (for management)
router.get('/users', async (req, res) => {
  try {
    const { role } = req.query;

    let queryText = `
      SELECT user_id, email, full_name, role, phone, created_at, last_login, is_active
      FROM users
    `;

    const params = [];
    if (role) {
      queryText += ' WHERE role = $1';
      params.push(role);
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, params);

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// Deactivate user account
router.post('/users/:userId/deactivate', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await query(
      'UPDATE users SET is_active = false WHERE user_id = $1 RETURNING *',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deactivated successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Failed to deactivate user', details: error.message });
  }
});

module.exports = router;
