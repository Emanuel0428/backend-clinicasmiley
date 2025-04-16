const supabase = require('../config/supabase');

const getGastos = async (req, res, next) => {
  try {
    const { id_sede } = req.query;
    const query = supabase.from('Gastos').select('*');
    if (id_sede) {
      query.eq('id_sede', id_sede);
    }
    const { data, error } = await query;
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error('Error fetching gastos:', err);
    next(err);
  }
};

const createGasto = async (req, res, next) => {
  try {
    const { fecha, concepto, monto, proovedor, tipo_gasto, id_sede } = req.body;
    const parsedMonto = parseFloat(monto);
    const parsedIdSede = parseInt(id_sede, 10);

    if (!concepto || isNaN(parsedMonto) || parsedMonto < 0 || !tipo_gasto || isNaN(parsedIdSede)) {
      return res.status(400).json({ error: 'Concepto, monto válido, tipo de gasto e id_sede son requeridos' });
    }

    const { data, error } = await supabase
      .from('Gastos')
      .insert({ fecha, concepto, monto: parsedMonto, proovedor, tipo_gasto, id_sede: parsedIdSede })
      .select();

    if (error) throw error;

    // Actualizar la base de la caja restando el monto
    const { data: caja, error: cajaError } = await supabase
      .from('Caja')
      .select('base')
      .eq('id_sede', parsedIdSede)
      .single();

    if (cajaError) throw cajaError;

    const currentBase = caja.base || 0;
    const newBase = currentBase - parsedMonto;

    if (newBase < 0) {
      return res.status(400).json({ error: 'El monto del gasto excede la base actual de la caja' });
    }

    const { error: updateCajaError } = await supabase
      .from('Caja')
      .upsert({ id_sede: parsedIdSede, base: newBase }, { onConflict: 'id_sede' });

    if (updateCajaError) throw updateCajaError;

    res.status(201).json(data[0]);
  } catch (err) {
    console.error('Error creating gasto:', err);
    next(err);
  }
};

module.exports = { getGastos, createGasto };