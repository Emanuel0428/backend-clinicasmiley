// src/routes/dataRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  getDoctors,
  getAssistants,
  getServices,
  getPaymentMethods,
} = require('../controllers/dataController');

// Protect all routes with JWT verification
router.get('/doctors', verifyToken, getDoctors);
router.get('/assistants', verifyToken, getAssistants);
router.get('/services', verifyToken, getServices);
router.get('/payment-methods', verifyToken, getPaymentMethods);

module.exports = router;