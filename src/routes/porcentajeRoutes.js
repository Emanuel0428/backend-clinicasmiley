const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getPorcentaje } = require('../controllers/porcentajeController');

// Protect the route with JWT verification
router.get('/porcentajes/:id', verifyToken, getPorcentaje);

module.exports = router;