/**
 * Center Admin Routes
 */

const express = require('express');
const router = express.Router();

router.get('/dashboard', async (req, res) => {
  res.json({ message: 'Center Admin dashboard' });
});

router.post('/projects', async (req, res) => {
  res.json({ message: 'Create project endpoint' });
});

router.post('/certificates/issue', async (req, res) => {
  res.json({ message: 'Issue certificate endpoint' });
});

module.exports = router;
