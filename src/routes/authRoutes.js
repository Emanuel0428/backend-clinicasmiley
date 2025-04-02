// File: src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');
const { validateLogin } = require('../middleware/validateRequest');

router.post('/login', validateLogin, login);


router.post('/refresh-token', async (req, res, next) => {
    const { token } = req.body;
  
    if (!token) {
      const err = new Error('Token no proporcionado');
      err.statusCode = 400;
      throw err;
    }
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
      const newToken = jwt.sign(
        { id: decoded.id, usuario: decoded.usuario, role: decoded.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      res.status(200).json({ token: newToken });
    } catch (err) {
      const error = new Error('Token inválido');
      error.statusCode = 401;
      throw error;
    }
  });

module.exports = router;