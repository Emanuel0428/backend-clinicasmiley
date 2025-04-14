// src/routes/recordRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  createRecord,
  getRecords,
  deleteRecords,
  createLiquidation,
  getLiquidations,
  deleteLiquidations,
  searchPatients,
} = require('../controllers/recordController');

// Protect all routes with JWT verification
router.post('/records', verifyToken, createRecord);
router.get('/records', verifyToken, getRecords);
router.delete('/records', verifyToken, deleteRecords);
router.post('/liquidations', verifyToken, createLiquidation);
router.get('/liquidations', verifyToken, getLiquidations);
router.delete('/liquidations', verifyToken, deleteLiquidations);
router.get('/patients/search', verifyToken, searchPatients);
module.exports = router;