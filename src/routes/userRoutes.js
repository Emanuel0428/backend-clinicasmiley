// File: src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/profile', verifyToken, (req, res) => {
  res.status(200).json({ message: 'Token válido', user: req.user });
});

module.exports = router;