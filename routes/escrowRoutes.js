const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

// This is a placeholder for escrow-related operations
// that might need to be accessed by multiple roles

// Get escrow transaction details
router.get('/transactions/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    let result;

    // System Admin can see all transactions
    if (userRole === 'system_admin') {
      result = await query(
        'SELECT * FROM escrow_transactions WHERE transaction_id = $1',
        [transactionId]
      );
    } else {
      // Others can only see their related transactions
      result = await query(
        `SELECT et.* FROM escrow_transactions et
         LEFT JOIN student_groups sg ON et.group_id = sg.group_id
         LEFT JOIN student_group_members sgm ON sg.group_id = sgm.group_id
         LEFT JOIN centers c ON et.center_id = c.center_id
         WHERE et.transaction_id = $1 
           AND (sgm.user_id = $2 OR c.center_admin_id = $2)`,
        [transactionId, userId]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found or access denied' });
    }

    res.json({ transaction: result.rows[0] });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction', details: error.message });
  }
});

// Get all transactions for a group
router.get('/groups/:groupId/transactions', async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    // Verify user has access to this group
    const accessCheck = await query(
      `SELECT 1 FROM student_group_members WHERE group_id = $1 AND user_id = $2
       UNION
       SELECT 1 FROM student_groups sg
       JOIN project_showcases p ON sg.project_id = p.project_id
       JOIN centers c ON p.center_id = c.center_id
       WHERE sg.group_id = $1 AND c.center_admin_id = $2`,
      [groupId, userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      'SELECT * FROM escrow_transactions WHERE group_id = $1 ORDER BY created_at DESC',
      [groupId]
    );

    res.json({ transactions: result.rows });
  } catch (error) {
    console.error('Get group transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions', details: error.message });
  }
});

module.exports = router;
