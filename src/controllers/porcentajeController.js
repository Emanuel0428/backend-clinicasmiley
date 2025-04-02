const supabase = require('../config/supabase');

const getPorcentaje = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      const err = new Error('El id_porc es requerido');
      err.statusCode = 400;
      throw err;
    }

    const { data, error } = await supabase
      .from('Porcentaje_pagos')
      .select('porcentaje')
      .eq('id_porc', id) 
      .single();

    if (error || !data) {
      const err = new Error('Porcentaje no encontrado');
      err.statusCode = 404;
      throw err;
    }

    res.status(200).json({ porcentaje: data.porcentaje });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPorcentaje };