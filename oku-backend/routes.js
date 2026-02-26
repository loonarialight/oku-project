const express = require("express");
const router = express.Router();

router.use(require("./routes/auth"));
router.use(require("./routes/profile"));
router.use(require("./routes/analytics"));
router.use(require("./routes/learning"));

module.exports = router;