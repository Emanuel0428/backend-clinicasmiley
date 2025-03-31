// src/routes/sedeRoutes.js
const express = require('express');
const router = express.Router();
const sedeController = require('../controllers/sedeController');
const authMiddleware = require('../middleware/authMiddleware');

// Ruta para obtener las sedes, protegida con authMiddleware.verifyToken
router.get('/sedes', authMiddleware.verifyToken, sedeController.getSedes);

module.exports = router;