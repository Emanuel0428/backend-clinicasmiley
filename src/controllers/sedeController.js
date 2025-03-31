// src/controllers/sedeController.js
const supabase = require('../config/supabase');

const getSedes = async (req, res, next) => {
  try {
    const { data: sedes, error } = await supabase
      .from('Sedes')
      .select('id_sede, sede');

    if (error) {
      const err = new Error('Error al obtener las sedes');
      err.statusCode = 500;
      throw err;
    }

    res.status(200).json(sedes);
  } catch (err) {
    next(err);
  }
};

module.exports = { getSedes }; // Exportamos como un objeto con la función getSedes