/**
 * Mentor Routes
 */

const express = require('express');
const router = express.Router();

router.get('/dashboard', async (req, res) => {
  res.json({ message: 'Mentor dashboard' });
});

router.get('/sessions', async (req, res) => {
  res.json({ message: 'Mentor sessions' });
});

module.exports = router;
