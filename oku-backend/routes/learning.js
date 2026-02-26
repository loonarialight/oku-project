const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const addXP = require("../utils/xp");

const router = express.Router();

const FREE_TOPICS_COUNT = 3;

const STATUS_LABELS = {
  completed: "ПРОЙДЕНО",
  locked:    "ЗАКРЫТО",
  open:      "ОТКРЫТО",
};

const ICONS = {
  completed: "✅",
  locked:    "🔒",
  open:      "📖",
};

const HINTS = {
  completed: "Тема пройдена. Можно повторить.",
  locked:    "Завершите предыдущую тему, чтобы открыть эту.",
  open:      null,
};

router.get("/grades", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, number FROM grades ORDER BY number"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/subjects/:gradeNumber", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT s.id, s.name
       FROM subjects s
       JOIN topics t ON t.subject_id = s.id
       JOIN grades g ON t.grade_id = g.id
       WHERE g.number = $1
       ORDER BY s.name`,
      [req.params.gradeNumber]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/learn/topic/:id/lessons", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, order_index
       FROM lessons
       WHERE topic_id = $1
       ORDER BY order_index`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/learn/topic/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title FROM topics WHERE id = $1",
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Topic not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/learn/:grade/:subject", authMiddleware, async (req, res) => {
  const { grade, subject } = req.params;
  const userId = req.user.id;

  try {
const result = await pool.query(
  `SELECT 
    t.id,
    t.title,
    t.order_index,
    COUNT(l.id)::INT AS lessons_count,
    COALESCE(utp.completed, false) AS completed,
    utp.completed_at
   FROM topics t
   JOIN grades g ON t.grade_id = g.id
   JOIN subjects s ON t.subject_id = s.id
   LEFT JOIN lessons l ON l.topic_id = t.id
   LEFT JOIN user_topic_progress utp
     ON utp.topic_id = t.id AND utp.user_id = $3
   WHERE g.number = $1 AND s.name = $2
   GROUP BY t.id, t.title, t.order_index, utp.completed, utp.completed_at
   ORDER BY t.order_index`,
  [grade, subject, userId]
);

    const topics = result.rows.map((topic, index, arr) => {
      let status = "open";
      let is_locked = false;

      if (topic.completed) {
        status = "completed";
      } else if (index >= FREE_TOPICS_COUNT && !arr[index - 1]?.completed) {
        status = "locked";
        is_locked = true;
      }

      return {
        ...topic,
        status,
        status_label: STATUS_LABELS[status],
        icon:         ICONS[status],
        hint:         HINTS[status],
        is_locked,
        reward_xp: 50,
      };
    });

    res.json(topics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/lesson/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title, content FROM lessons WHERE id = $1",
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Lesson not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/topics/:id/complete", authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO user_topic_progress (user_id, topic_id, completed, completed_at)
       VALUES ($1, $2, true, NOW())
       ON CONFLICT (user_id, topic_id)
       DO UPDATE SET completed = true, completed_at = NOW()`,
      [req.user.id, req.params.id]
    );

    const result = await addXP(req.user.id, 50);
    res.json({ message: "Topic completed", bonusXP: 50, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get("/learn/topic/:id/tasks", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, question, type, options, hint, order_index
       FROM tasks
       WHERE topic_id = $1
       ORDER BY order_index`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/tasks/:id/submit", authMiddleware, async (req, res) => {
  const { answer } = req.body;
  try {
    const result = await pool.query(
      "SELECT correct_answer, explanation FROM tasks WHERE id = $1",
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Task not found" });

    const { correct_answer, explanation } = result.rows[0];
    const correct = answer.trim().toLowerCase() === correct_answer.trim().toLowerCase();

    let xp_earned = 0;
    let new_level = null;
    let topic_completed = false;

    if (correct) {
      const xpResult = await addXP(req.user.id, 10);
      xp_earned = 10;
      new_level = xpResult.level;
    }

    res.json({ correct, correct_answer, explanation, xp_earned, new_level, topic_completed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;