const pool = require("../db");

async function addXP(userId, amount) {
  const user = await pool.query(
    "SELECT xp, level FROM users WHERE id = $1",
    [userId]
  );

  let { xp, level } = user.rows[0];
  xp += amount;

  if (xp >= level * level * 100) {
    level += 1;
  }

  await pool.query(
    "UPDATE users SET xp = $1, level = $2 WHERE id = $3",
    [xp, level, userId]
  );

  return { xp, level };
}

module.exports = addXP;