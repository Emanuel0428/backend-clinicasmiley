const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  getDoctors,
  getAssistants,
  getServices,
  getPaymentMethods,
  getAccounts,
  addService,     
  updateService,  
  deleteService,   
} = require('../controllers/dataController');

router.get('/doctors', verifyToken, getDoctors);
router.get('/assistants', verifyToken, getAssistants);
router.get('/services', verifyToken, getServices);
router.post('/services', verifyToken, addService);     
router.put('/services', verifyToken, updateService);  
router.delete('/services', verifyToken, deleteService);
router.get('/payment-methods', verifyToken, getPaymentMethods);
router.get('/accounts', verifyToken, getAccounts);

module.exports = router;