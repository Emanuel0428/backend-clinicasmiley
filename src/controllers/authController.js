// src/controllers/authController.js
const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res, next) => {
  const { usuario, clave } = req.body;

  try {

    const { data: user, error } = await supabase
      .from('Usuarios')
      .select('*')
      .eq('usuario', usuario)
      .single();

    if (error || !user) {
      const err = new Error('Usuario no encontrado');
      err.statusCode = 404;
      throw err;
    }


    const isPasswordValid = await bcrypt.compare(clave, user.clave);
    if (!isPasswordValid) {
      const err = new Error('Contraseña incorrecta');
      err.statusCode = 401;
      throw err;
    }

    const token = jwt.sign(
      { id: user.id, usuario: user.usuario, role: user.id_rol },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      token,
      user: {
        id: user.id,
        usuario: user.usuario,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { login };