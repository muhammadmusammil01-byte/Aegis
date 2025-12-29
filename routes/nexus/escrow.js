/**
 * Escrow Routes
 */

const express = require('express');
const router = express.Router();
const db = require('../../config/database');

router.post('/initiate', async (req, res) => {
  res.json({ message: 'Escrow initiation endpoint' });
});

router.post('/release/:id', async (req, res) => {
  res.json({ message: 'Escrow release endpoint' });
});

router.get('/:id', async (req, res) => {
  res.json({ message: 'Escrow details endpoint' });
});

module.exports = router;
