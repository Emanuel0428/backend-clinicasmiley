const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const err = new Error('Token no proporcionado');
      err.statusCode = 401;
      return next(err);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    next();
  } catch (err) {
    const error = new Error('Token inválido o expirado');
    error.statusCode = 401;
    return next(error); // Usa next para enviar el error al manejador
  }
};

module.exports = { verifyToken };
