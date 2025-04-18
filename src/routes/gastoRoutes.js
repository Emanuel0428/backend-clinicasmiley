// src/routes/gastoRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { createGasto, getGastos } = require('../controllers/gastoController');

router.post('/gastos', verifyToken, createGasto);

router.get('/gastos', verifyToken, getGastos);

module.exports = router;