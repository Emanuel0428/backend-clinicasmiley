// src/controllers/gastoController.js
const supabase = require('../config/supabase');

const createGasto = async (req, res, next) => {
  try {
    const {
      fecha,
      concepto,
      proveedor,
      tipoGasto,
      valor,
      responsable,
      comentario,
      id_sede,
    } = req.body;

    if (!fecha || !concepto || !proveedor || !tipoGasto || !valor || !responsable || !id_sede) {
      const err = new Error('Faltan campos requeridos (fecha, concepto, proveedor, tipoGasto, valor, responsable, id_sede)');
      err.statusCode = 400;
      throw err;
    }
    if (typeof valor !== 'number' || valor <= 0) {
        const err = new Error('El valor del gasto debe ser un número positivo.');
        err.statusCode = 400;
        throw err;
    }
    const sedeIdParsed = parseInt(id_sede, 10);
     if (isNaN(sedeIdParsed)) {
        const err = new Error('El id_sede debe ser un número válido');
        err.statusCode = 400;
        throw err;
    }

    console.log('Registrando gasto:', req.body);

    const { data, error } = await supabase.rpc('registrar_gasto_y_actualizar_caja', {
        p_id_sede: sedeIdParsed,
        p_fecha: fecha,
        p_concepto: concepto,
        p_monto: valor,
        p_proveedor: proveedor,
        p_tipo_gasto: tipoGasto,
        p_responsable: responsable,
        p_comentario: comentario || null 
    });

    if (error) {
        console.error("Error al llamar RPC 'registrar_gasto_y_actualizar_caja':", error);
        const err = new Error('Error al registrar el gasto en la base de datos.');
        err.statusCode = 500; 
        err.details = error; 
        throw err;
    }

    if (data === false) {
        console.error("La función RPC 'registrar_gasto_y_actualizar_caja' devolvió false.");
        const err = new Error('No se pudo completar el registro del gasto (fallo en RPC).');
        err.statusCode = 500;
        throw err;
    }


    console.log('Gasto registrado y caja actualizada exitosamente.');
    res.status(201).json({ message: 'Gasto registrado exitosamente' });

  } catch (err) {
     console.error("Error en createGasto:", err); 
     next(err);
  }
};

const getGastos = async (req, res, next) => {
  try {
    const { id_sede } = req.query;

    if (!id_sede) {
      return res.status(400).json({ error: 'El id_sede es requerido' });
    }

    const { data, error } = await supabase
      .from('Gastos')
      .select('*')
      .eq('id_sede', id_sede);

    if (error) {
      console.error('Error al obtener gastos:', error);
      return res.status(500).json({ error: 'Error al obtener gastos' });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('Error en getGastos:', err);
    next(err);
  }
}


module.exports = { createGasto, getGastos };