const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/profile", authMiddleware, (req, res) => {
  res.json({ message: "Protected route", user: req.user });
});

router.get("/profile/stats", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT xp, level FROM users WHERE id = $1",
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;