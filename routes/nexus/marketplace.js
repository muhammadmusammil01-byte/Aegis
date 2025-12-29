/**
 * Marketplace Routes (Public)
 */

const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { optionalAuth } = require('../../middleware/rbac');

/**
 * GET /api/marketplace
 * Get all active projects
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search } = req.query;
    
    let query = `
      SELECT p.*, c.name as center_name
      FROM projects p
      JOIN centers c ON p.center_id = c.id
      WHERE p.status = 'ACTIVE' AND c.status = 'APPROVED'
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (category) {
      query += ` AND p.category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }
    
    if (minPrice) {
      query += ` AND p.price >= $${paramCount}`;
      params.push(minPrice);
      paramCount++;
    }
    
    if (maxPrice) {
      query += ` AND p.price <= $${paramCount}`;
      params.push(maxPrice);
      paramCount++;
    }
    
    if (search) {
      query += ` AND (p.title ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }
    
    query += ' ORDER BY p.created_at DESC';
    
    const result = await db.query(query, params);
    
    res.json({
      projects: result.rows,
      total: result.rows.length
    });
    
  } catch (error) {
    console.error('Marketplace error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

/**
 * GET /api/marketplace/:id
 * Get project details (requires authentication for full details)
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      `SELECT p.*, c.name as center_name, c.email as center_email
       FROM projects p
       JOIN centers c ON p.center_id = c.id
       WHERE p.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const project = result.rows[0];
    
    // Update view count
    await db.query(
      'UPDATE projects SET views_count = views_count + 1 WHERE id = $1',
      [id]
    );
    
    // Add watermark info if user is authenticated
    if (req.user) {
      project.watermark = {
        email: req.user.email,
        ip: req.ip,
        timestamp: new Date().toISOString()
      };
    }
    
    res.json({ project });
    
  } catch (error) {
    console.error('Project details error:', error);
    res.status(500).json({ error: 'Failed to fetch project details' });
  }
});

module.exports = router;
