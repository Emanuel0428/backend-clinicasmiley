// src/controllers/cajaController.js
const supabase = require('../config/supabase');

const getCajaBase = async (req, res, next) => {
    try {
      const id_sede = parseInt(req.params.id_sede, 10);
      console.log(`getCajaBase - id_sede recibido: ${req.params.id_sede}, parseado: ${id_sede}`); // LOG
  
      if (isNaN(id_sede)) {
        return res.status(400).json({ error: 'id_sede debe ser un número válido' });
      }
  
      console.log(`getCajaBase - Consultando Supabase para id_sede: ${id_sede}`); // LOG
      const { data, error } = await supabase
        .from('Caja')
        .select('base')
        .eq('id_sede', id_sede)
        .maybeSingle();
  
      if (error) {
        console.error('getCajaBase - Supabase error:', error);
        throw error;
      } else {
        console.log('getCajaBase - Supabase data:', data);
      }
  
      if (!data) {
        return res.status(404).json({ error: 'No se encontró registro para la sede especificada', base: 0 });
      }
  
      res.status(200).json({ base: data.base ?? 0 });
    } catch (err) {
      console.error('getCajaBase - Caught Error:', err);
      next(err);
    }
  };

const updateCajaBase = async (req, res, next) => {
  try {
    const userRole = req.user?.usuario;
    console.log("updateCajaBase - req.user:", req.user);
    console.log("updateCajaBase - User role check:", userRole);

    const id_sede = parseInt(req.params.id_sede, 10);
    const { base } = req.body;
    console.log(`updateCajaBase - id_sede: ${id_sede}, base: ${base}`);

    console.log(`updateCajaBase - Upserting Supabase para id_sede: ${id_sede} con base: ${base}`);
    const { data, error } = await supabase
      .from('Caja')
      .upsert({ id_sede: id_sede, base: base }, { onConflict: 'id_sede' })
      .select('base')
      .single();

    if (error) {
        console.error("updateCajaBase - Supabase upsert error:", error);
     } else {
        console.log("updateCajaBase - Supabase upsert data:", data);
     }

    console.log("updateCajaBase - Upsert exitoso (o sin error). Devolviendo base de entrada:", base);
    res.status(200).json({ base: data.base });

  } catch (err) {
    console.error("updateCajaBase - Caught Error:", err);
    next(err);
  }
};

module.exports = { getCajaBase, updateCajaBase };