// File: src/middleware/validateRequest.js
const { body, validationResult } = require('express-validator');

const validateLogin = [
  body('usuario')
    .notEmpty()
    .withMessage('El campo usuario es obligatorio')
    .isString()
    .withMessage('El usuario debe ser una cadena de texto'),
  body('clave')
    .notEmpty()
    .withMessage('El campo contraseña es obligatorio')
    .isString()
    .withMessage('La contraseña debe ser una cadena de texto'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    next();
  },
];

module.exports = { validateLogin };