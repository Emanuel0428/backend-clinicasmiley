// File: src/controllers/recordController.js
const supabase = require('../config/supabase');

const createRecord = async (req, res, next) => {
  try {
    const {
      nombreDoctor,
      nombreAsistente,
      nombrePaciente,
      servicio,
      sesionesParaCompletar,
      sesionesCompletadas,
      abono,
      descuento,
      esPacientePropio,
      fecha,
      metodoPago,
    } = req.body;

    const valorTotal = abono - descuento;

    const { data, error } = await supabase
      .from('dia_dia')
      .insert([
        {
          nombre_doc: nombreDoctor,
          nombre_aux: nombreAsistente,
          paciente: nombrePaciente,
          nombre_serv: servicio,
          sesiones_para_completar: sesionesParaCompletar,
          sesiones_completadas: sesionesCompletadas,
          abono,
          descuento,
          valor_total: valorTotal,
          es_paciente_propio: esPacientePropio,
          fecha_liquid: fecha,
          metodo_pago: metodoPago,
        },
      ])
      .select()
      .single();

    if (error) {
      const err = new Error('Error al crear el registro');
      err.statusCode = 500;
      throw err;
    }

    res.status(201).json({
      id: data.id,
      nombre_doctor: data.nombre_doc,
      nombre_asistente: data.nombre_aux,
      nombre_paciente: data.paciente,
      servicio: data.nombre_serv,
      sesiones_para_completar: data.sesiones_para_completar,
      sesiones_completadas: data.sesiones_completadas,
      abono: data.abono,
      descuento: data.descuento,
      total: data.valor_total,
      es_paciente_propio: data.es_paciente_propio,
      fecha: data.fecha_liquid,
      metodo_pago: data.metodo_pago,
    });
  } catch (err) {
    next(err);
  }
};

const getRecords = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('dia_dia')
      .select('*')
      .order('fecha_liquid', { ascending: false });

    if (error) {
      const err = new Error('Error al obtener los registros');
      err.statusCode = 500;
      throw err;
    }

    // Map the data to match the frontend's expected format
    const formattedData = data.map((record) => ({
      id: record.id,
      nombre_doctor: record.nombre_doc,
      nombre_asistente: record.nombre_aux,
      nombre_paciente: record.paciente,
      servicio: record.nombre_serv,
      sesiones_para_completar: record.sesiones_para_completar,
      sesiones_completadas: record.sesiones_completadas,
      abono: record.abono,
      descuento: record.descuento,
      total: record.valor_total,
      es_paciente_propio: record.es_paciente_propio,
      fecha: record.fecha_liquid,
      metodo_pago: record.metodo_pago,
    }));

    res.status(200).json(formattedData);
  } catch (err) {
    next(err);
  }
};

const deleteRecords = async (req, res, next) => {
  try {
    const { ids } = req.body; // Array of record IDs to delete

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      const err = new Error('Se requiere un array de IDs para eliminar');
      err.statusCode = 400;
      throw err;
    }

    const { error } = await supabase
      .from('dia_dia')
      .delete()
      .in('id', ids);

    if (error) {
      const err = new Error('Error al eliminar los registros');
      err.statusCode = 500;
      throw err;
    }

    res.status(200).json({ message: 'Registros eliminados exitosamente' });
  } catch (err) {
    next(err);
  }
};

const createLiquidation = async (req, res, next) => {
  try {
    const { doctor, fechaInicio, fechaFin, servicios, totalLiquidado, fechaLiquidacion } = req.body;

    const { data, error } = await supabase
      .from('Historial_Liquidaciones')
      .insert([
        {
          doctor,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          servicios,
          total_liquidado: totalLiquidado,
          fecha_liquidacion: fechaLiquidacion,
        },
      ])
      .select()
      .single();

    if (error) {
      const err = new Error('Error al guardar la liquidación');
      err.statusCode = 500;
      throw err;
    }

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};

const getLiquidations = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('Historial_Liquidaciones')
      .select('*')
      .order('fecha_liquidacion', { ascending: false });

    if (error) {
      const err = new Error('Error al obtener el historial de liquidaciones');
      err.statusCode = 500;
      throw err;
    }

    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createRecord,
  getRecords,
  deleteRecords,
  createLiquidation,
  getLiquidations,
};