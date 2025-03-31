// src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Extract token from "Bearer <token>"

  if (!token) {
    const err = new Error('Token no proporcionado');
    err.statusCode = 401;
    throw err;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach the decoded user data to the request
    next();
  } catch (err) {
    const error = new Error('Token inválido o expirado');
    error.statusCode = 401;
    throw error;
  }
};

module.exports = { verifyToken };