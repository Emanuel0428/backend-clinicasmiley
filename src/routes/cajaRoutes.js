// src/routes/cajaRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getCajaBase, updateCajaBase } = require('../controllers/cajaController');

// Obtener la base de la caja para una sede
router.get('/caja/:id_sede', verifyToken, getCajaBase);

// Actualizar la base de la caja para una sede (protegido por rol en el controller)
router.put('/caja/:id_sede', verifyToken, updateCajaBase);

module.exports = router;