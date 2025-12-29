const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

// Get all active projects for marketplace (public)
router.get('/projects', async (req, res) => {
  try {
    const { 
      difficulty, 
      minPrice, 
      maxPrice, 
      techStack,
      page = 1, 
      limit = 12 
    } = req.query;

    let queryText = `
      SELECT 
        p.project_id,
        p.title,
        p.description,
        p.tech_stack,
        p.difficulty_level,
        p.estimated_duration_weeks,
        p.price,
        p.thumbnail_url,
        p.views_count,
        p.purchases_count,
        c.center_name,
        c.location as center_location
      FROM project_showcases p
      JOIN centers c ON p.center_id = c.center_id
      WHERE p.status = 'active' AND c.status = 'approved'
    `;

    const queryParams = [];
    let paramIndex = 1;

    if (difficulty) {
      queryText += ` AND p.difficulty_level = $${paramIndex}`;
      queryParams.push(difficulty);
      paramIndex++;
    }

    if (minPrice) {
      queryText += ` AND p.price >= $${paramIndex}`;
      queryParams.push(parseFloat(minPrice));
      paramIndex++;
    }

    if (maxPrice) {
      queryText += ` AND p.price <= $${paramIndex}`;
      queryParams.push(parseFloat(maxPrice));
      paramIndex++;
    }

    if (techStack) {
      queryText += ` AND $${paramIndex} = ANY(p.tech_stack)`;
      queryParams.push(techStack);
      paramIndex++;
    }

    queryText += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit));
    queryParams.push((parseInt(page) - 1) * parseInt(limit));

    const result = await query(queryText, queryParams);

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) FROM project_showcases WHERE status = $1',
      ['active']
    );

    res.json({
      projects: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects', details: error.message });
  }
});

// Get single project details (increments view count)
router.get('/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Increment view count
    await query(
      'UPDATE project_showcases SET views_count = views_count + 1 WHERE project_id = $1',
      [projectId]
    );

    // Get project details
    const result = await query(
      `SELECT 
        p.*,
        c.center_name,
        c.location as center_location,
        c.description as center_description
      FROM project_showcases p
      JOIN centers c ON p.center_id = c.center_id
      WHERE p.project_id = $1 AND p.status = 'active' AND c.status = 'approved'`,
      [projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found or not available' });
    }

    res.json({ project: result.rows[0] });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to fetch project details', details: error.message });
  }
});

// Get all approved centers
router.get('/centers', async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        center_id,
        center_name,
        description,
        location,
        established_date
      FROM centers
      WHERE status = 'approved'
      ORDER BY center_name ASC`
    );

    res.json({ centers: result.rows });
  } catch (error) {
    console.error('Get centers error:', error);
    res.status(500).json({ error: 'Failed to fetch centers', details: error.message });
  }
});

// Get projects by center
router.get('/centers/:centerId/projects', async (req, res) => {
  try {
    const { centerId } = req.params;

    const result = await query(
      `SELECT 
        project_id,
        title,
        description,
        tech_stack,
        difficulty_level,
        estimated_duration_weeks,
        price,
        thumbnail_url,
        views_count,
        purchases_count
      FROM project_showcases
      WHERE center_id = $1 AND status = 'active'
      ORDER BY created_at DESC`,
      [centerId]
    );

    res.json({ projects: result.rows });
  } catch (error) {
    console.error('Get center projects error:', error);
    res.status(500).json({ error: 'Failed to fetch center projects', details: error.message });
  }
});

// Search projects
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const result = await query(
      `SELECT 
        p.project_id,
        p.title,
        p.description,
        p.tech_stack,
        p.difficulty_level,
        p.price,
        p.thumbnail_url,
        c.center_name
      FROM project_showcases p
      JOIN centers c ON p.center_id = c.center_id
      WHERE p.status = 'active' 
        AND c.status = 'approved'
        AND (
          p.title ILIKE $1 
          OR p.description ILIKE $1
          OR EXISTS (
            SELECT 1 FROM unnest(p.tech_stack) AS tech 
            WHERE tech ILIKE $1
          )
        )
      ORDER BY p.views_count DESC, p.created_at DESC
      LIMIT 20`,
      [`%${q}%`]
    );

    res.json({ results: result.rows, query: q });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

module.exports = router;
