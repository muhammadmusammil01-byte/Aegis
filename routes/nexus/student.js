/**
 * Student Routes
 */

const express = require('express');
const router = express.Router();

router.get('/dashboard', async (req, res) => {
  res.json({ message: 'Student dashboard' });
});

router.post('/groups/create', async (req, res) => {
  res.json({ message: 'Create group endpoint' });
});

router.post('/purchase', async (req, res) => {
  res.json({ message: 'Purchase project endpoint' });
});

module.exports = router;
