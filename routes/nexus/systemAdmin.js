/**
 * System Admin Routes
 */

const express = require('express');
const router = express.Router();
const db = require('../../config/database');

router.get('/dashboard', async (req, res) => {
  res.json({ message: 'System Admin dashboard' });
});

router.get('/centers/pending', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.*, u.username, u.email as admin_email
      FROM centers c
      JOIN users u ON c.admin_id = u.id
      WHERE c.status = 'PENDING_APPROVAL'
      ORDER BY c.created_at DESC
    `);
    
    res.json({ centers: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending centers' });
  }
});

router.post('/centers/:id/approve', async (req, res) => {
  res.json({ message: 'Approve center endpoint' });
});

module.exports = router;
