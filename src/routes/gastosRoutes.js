const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getGastos, createGasto } = require('../controllers/gastosController');

router.get('/gastos',verifyToken, getGastos);
router.post('/gastos',verifyToken, createGasto);

module.exports = router;