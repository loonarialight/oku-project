const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/subjects", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name FROM subjects ORDER BY name"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/session/start", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { subject_id } = req.body;
  try {
    if (!subject_id)
      return res.status(400).json({ error: "Subject is required" });

    const active = await pool.query(
      "SELECT id FROM study_sessions WHERE user_id = $1 AND end_time IS NULL",
      [userId]
    );
    if (active.rows.length > 0)
      return res.status(400).json({ error: "You already have an active session" });

    const result = await pool.query(
      "INSERT INTO study_sessions (user_id, subject_id, start_time) VALUES ($1, $2, NOW()) RETURNING *",
      [userId, subject_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/session/end/:id", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const sessionId = req.params.id;
  try {
    const session = await pool.query(
      "SELECT * FROM study_sessions WHERE id = $1 AND user_id = $2",
      [sessionId, userId]
    );
    if (session.rows.length === 0)
      return res.status(404).json({ error: "Session not found" });
    if (session.rows[0].end_time !== null)
      return res.status(400).json({ error: "Session already ended" });

    const result = await pool.query(
      `UPDATE study_sessions
       SET end_time = NOW(),
           duration_minutes = ROUND(EXTRACT(EPOCH FROM (NOW() - start_time)) / 60)
       WHERE id = $1 RETURNING *`,
      [sessionId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/analytics/user", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DATE(start_time) as date, SUM(duration_minutes) as total_minutes
       FROM study_sessions WHERE user_id = $1
       GROUP BY DATE(start_time) ORDER BY date`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/analytics/hours", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        EXTRACT(HOUR FROM start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bishkek')::INT AS hour,
        COUNT(*)::INT AS sessions_count,
        COALESCE(SUM(ROUND(duration_minutes)), 0)::INT AS total_minutes
       FROM study_sessions
       WHERE user_id = $1 AND end_time IS NOT NULL
       GROUP BY hour ORDER BY hour`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/analytics/subjects", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        s.name,
        COUNT(ss.id)::INT AS sessions_count,
        COALESCE(SUM(ROUND(ss.duration_minutes)), 0)::INT AS total_minutes
       FROM study_sessions ss
       JOIN subjects s ON ss.subject_id = s.id
       WHERE ss.user_id = $1 AND ss.end_time IS NOT NULL
       GROUP BY s.name ORDER BY total_minutes DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/analytics/streak", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT DATE(start_time) as date
       FROM study_sessions
       WHERE user_id = $1 AND end_time IS NOT NULL
       ORDER BY date DESC`,
      [req.user.id]
    );

    const dates = result.rows.map((r) => r.date);
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < dates.length; i++) {
      const d = new Date(dates[i]);
      d.setHours(0, 0, 0, 0);
      const diff = (today - d) / (1000 * 60 * 60 * 24);
      if (diff === streak) streak++;
      else if (diff > streak) break;
    }

    res.json({ streak });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;