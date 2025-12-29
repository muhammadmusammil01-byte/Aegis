const express = require('express');
const router = express.Router();
const { query, getClient } = require('../config/database');

// Register/Create a center (pending approval)
router.post('/centers', async (req, res) => {
  try {
    const centerAdminId = req.user.userId;
    const { centerName, description, location, establishedDate } = req.body;

    // Check if user already has a center
    const existing = await query(
      'SELECT center_id FROM centers WHERE center_admin_id = $1',
      [centerAdminId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'You already have a registered center' });
    }

    const result = await query(
      `INSERT INTO centers (center_name, center_admin_id, description, location, established_date, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [centerName, centerAdminId, description, location, establishedDate]
    );

    res.status(201).json({ 
      message: 'Center registration submitted for approval',
      center: result.rows[0]
    });
  } catch (error) {
    console.error('Create center error:', error);
    res.status(500).json({ error: 'Failed to create center', details: error.message });
  }
});

// Get own center
router.get('/my-center', async (req, res) => {
  try {
    const centerAdminId = req.user.userId;

    const result = await query(
      'SELECT * FROM centers WHERE center_admin_id = $1',
      [centerAdminId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No center found. Please register one.' });
    }

    res.json({ center: result.rows[0] });
  } catch (error) {
    console.error('Get center error:', error);
    res.status(500).json({ error: 'Failed to fetch center', details: error.message });
  }
});

// Upload/Create project showcase
router.post('/projects', async (req, res) => {
  try {
    const centerAdminId = req.user.userId;
    const {
      title,
      description,
      techStack,
      difficultyLevel,
      estimatedDurationWeeks,
      price,
      thumbnailUrl,
      detailedContent,
      learningOutcomes,
      prerequisites
    } = req.body;

    // Get center ID
    const centerResult = await query(
      'SELECT center_id FROM centers WHERE center_admin_id = $1 AND status = $2',
      [centerAdminId, 'approved']
    );

    if (centerResult.rows.length === 0) {
      return res.status(403).json({ error: 'Your center must be approved to upload projects' });
    }

    const centerId = centerResult.rows[0].center_id;

    const result = await query(
      `INSERT INTO project_showcases (
        center_id, title, description, tech_stack, difficulty_level,
        estimated_duration_weeks, price, thumbnail_url, detailed_content,
        learning_outcomes, prerequisites, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active')
      RETURNING *`,
      [
        centerId, title, description, techStack, difficultyLevel,
        estimatedDurationWeeks, price, thumbnailUrl, detailedContent,
        learningOutcomes, prerequisites
      ]
    );

    res.status(201).json({ 
      message: 'Project showcase created successfully',
      project: result.rows[0]
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project', details: error.message });
  }
});

// Get own projects
router.get('/projects', async (req, res) => {
  try {
    const centerAdminId = req.user.userId;

    const result = await query(
      `SELECT p.* 
       FROM project_showcases p
       JOIN centers c ON p.center_id = c.center_id
       WHERE c.center_admin_id = $1
       ORDER BY p.created_at DESC`,
      [centerAdminId]
    );

    res.json({ projects: result.rows });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects', details: error.message });
  }
});

// Update project
router.put('/projects/:projectId', async (req, res) => {
  try {
    const centerAdminId = req.user.userId;
    const { projectId } = req.params;
    const updates = req.body;

    // Verify ownership
    const ownershipCheck = await query(
      `SELECT p.project_id FROM project_showcases p
       JOIN centers c ON p.center_id = c.center_id
       WHERE p.project_id = $1 AND c.center_admin_id = $2`,
      [projectId, centerAdminId]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Project not found or access denied' });
    }

    // Build dynamic update query
    const allowedFields = ['title', 'description', 'price', 'status', 'detailed_content'];
    const updateFields = [];
    const values = [];
    let valueIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${valueIndex}`);
        values.push(value);
        valueIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(projectId);
    const result = await query(
      `UPDATE project_showcases SET ${updateFields.join(', ')} 
       WHERE project_id = $${valueIndex} RETURNING *`,
      values
    );

    res.json({ message: 'Project updated successfully', project: result.rows[0] });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project', details: error.message });
  }
});

// Manage mentors - Add mentor
router.post('/mentors', async (req, res) => {
  try {
    const centerAdminId = req.user.userId;
    const { userId, expertise, yearsOfExperience, bio, hourlyRate } = req.body;

    // Get center ID
    const centerResult = await query(
      'SELECT center_id FROM centers WHERE center_admin_id = $1 AND status = $2',
      [centerAdminId, 'approved']
    );

    if (centerResult.rows.length === 0) {
      return res.status(403).json({ error: 'Center not found or not approved' });
    }

    const centerId = centerResult.rows[0].center_id;

    // Verify user is a mentor
    const userCheck = await query(
      'SELECT role FROM users WHERE user_id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0 || userCheck.rows[0].role !== 'mentor') {
      return res.status(400).json({ error: 'User not found or not a mentor' });
    }

    const result = await query(
      `INSERT INTO mentors (user_id, center_id, expertise, years_of_experience, bio, hourly_rate)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, centerId, expertise, yearsOfExperience, bio, hourlyRate]
    );

    res.status(201).json({ 
      message: 'Mentor added successfully',
      mentor: result.rows[0]
    });
  } catch (error) {
    console.error('Add mentor error:', error);
    res.status(500).json({ error: 'Failed to add mentor', details: error.message });
  }
});

// Get own mentors
router.get('/mentors', async (req, res) => {
  try {
    const centerAdminId = req.user.userId;

    const result = await query(
      `SELECT m.*, u.full_name, u.email, u.phone
       FROM mentors m
       JOIN users u ON m.user_id = u.user_id
       JOIN centers c ON m.center_id = c.center_id
       WHERE c.center_admin_id = $1
       ORDER BY m.created_at DESC`,
      [centerAdminId]
    );

    res.json({ mentors: result.rows });
  } catch (error) {
    console.error('Get mentors error:', error);
    res.status(500).json({ error: 'Failed to fetch mentors', details: error.message });
  }
});

// Issue Smart QR Certificate
router.post('/certificates', async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const centerAdminId = req.user.userId;
    const {
      groupId,
      projectId,
      certificateCode,
      qrCodeData,
      studentNames,
      projectCompletionDetails,
      skillsAcquired,
      certificateUrl
    } = req.body;

    // Verify center ownership
    const centerCheck = await client.query(
      'SELECT center_id FROM centers WHERE center_admin_id = $1 AND status = $2',
      [centerAdminId, 'approved']
    );

    if (centerCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Center not found or not approved' });
    }

    // Create certificate
    const certResult = await client.query(
      `INSERT INTO certificates (
        group_id, project_id, issued_by, certificate_code, qr_code_data,
        verification_url, student_names, project_completion_details,
        skills_acquired, certificate_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        groupId, projectId, centerAdminId, certificateCode, qrCodeData,
        `${process.env.APP_URL || 'http://localhost:3000'}/verify/${certificateCode}`,
        studentNames, projectCompletionDetails, skillsAcquired, certificateUrl
      ]
    );

    // Update escrow transaction to trigger fund release
    await client.query(
      `UPDATE escrow_transactions 
       SET status = 'held', certificate_id = $1
       WHERE group_id = $2 AND status = 'pending'`,
      [certResult.rows[0].certificate_id, groupId]
    );

    await client.query('COMMIT');

    res.status(201).json({ 
      message: 'Certificate issued successfully. Funds can now be released by System Admin.',
      certificate: certResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Issue certificate error:', error);
    res.status(500).json({ error: 'Failed to issue certificate', details: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
