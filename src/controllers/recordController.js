// File: src/controllers/recordController.js
const supabase = require('../config/supabase');

// File: src/controllers/recordController.js (solo createRecord)
const createRecord = async (req, res, next) => {
  try {
    console.log('Iniciando createRecord con datos:', req.body);

    const {
      nombreDoctor,
      nombrePaciente,
      docId,
      servicio,
      abono,
      descuento,
      esPacientePropio,
      fecha,
      metodoPago, // Este será el descpMetodo seleccionado desde el frontend
      esAuxiliar,
    } = req.body;

    // Obtener el valor y el número de sesiones del servicio desde la tabla Servicios
    console.log(`Buscando valor y sesiones del servicio: ${servicio} en la tabla Servicios`);
    const { data: servicioData, error: servicioError } = await supabase
      .from('Servicios')
      .select('valor, sesiones')
      .eq('nombre_serv', servicio)
      .single();

    if (servicioError || !servicioData) {
      console.error('Error al buscar el servicio:', servicioError);
      const err = new Error('Servicio no encontrado');
      err.statusCode = 404;
      throw err;
    }
    console.log('Datos del servicio encontrados:', servicioData);

    // Buscar el id_metodo basado en el descpMetodo recibido
    console.log(`Buscando id_metodo para el método de pago: ${metodoPago} en la tabla Metodos_Pagos`);
    const { data: metodoPagoData, error: metodoPagoError } = await supabase
      .from('Metodos_Pagos')
      .select('id_metodo')
      .eq('descpMetodo', metodoPago)
      .single();

    if (metodoPagoError || !metodoPagoData) {
      console.error('Error al buscar el método de pago:', metodoPagoError);
      const err = new Error('Método de pago no encontrado');
      err.statusCode = 404;
      throw err;
    }
    const idMetodo = metodoPagoData.id_metodo;
    console.log(`id_metodo encontrado: ${idMetodo}`);

    // Determinar el id_porc
    let idPorc;
    if (esAuxiliar) {
      console.log(`Es auxiliar. Buscando id_porc para el auxiliar: ${nombreDoctor} en la tabla Auxiliares`);
      const { data: auxiliarData, error: auxiliarError } = await supabase
        .from('Auxiliares')
        .select('id_porc')
        .eq('nombre_aux', nombreDoctor)
        .single();

      if (auxiliarError || !auxiliarData) {
        console.error('Error al buscar el auxiliar:', auxiliarError);
        const err = new Error('Auxiliar no encontrado');
        err.statusCode = 404;
        throw err;
      }
      idPorc = auxiliarData.id_porc;
      console.log(`id_porc encontrado para el auxiliar ${nombreDoctor}: ${idPorc}`);
    } else {
      idPorc = esPacientePropio ? 2 : 1;
      console.log(
        `Es doctor. Asignando id_porc según paciente propio: ${esPacientePropio}. id_porc: ${idPorc} (${
          idPorc === 2 ? '50%' : '40%'
        })`
      );
    }

    // Calcular el valor total
    let valorTotal = servicioData.valor;
    console.log(`Valor inicial del servicio: ${valorTotal}`);
    if (descuento !== null && descuento > 0) {
      valorTotal -= descuento;
      console.log(`Aplicando descuento de ${descuento}. Nuevo valor: ${valorTotal}`);
    }
    if (abono !== null && abono > 0) {
      valorTotal -= abono;
      console.log(`Aplicando abono de ${abono}. Nuevo valor: ${valorTotal}`);
    }
    if (valorTotal < 0) {
      console.log('Valor total negativo, ajustando a 0');
      valorTotal = 0;
    }
    console.log(`Valor total final: ${valorTotal}`);

    let fechaFinal = null;
    let recordData;
    let responseData;
    let statusCode = 201;

    if (servicioData.sesiones === 1) {
      console.log('El servicio tiene 1 sesión. Asignando fecha_final igual a fecha_inicio:', fecha);
      fechaFinal = fecha;

      recordData = {
        paciente: nombrePaciente,
        doc_id: docId,
        nombre_serv: servicio,
        abono: abono !== null ? abono : null,
        dcto: descuento !== null ? descuento : null,
        valor_total: valorTotal,
        fecha_inicio: fecha,
        fecha_final: fechaFinal,
        id_metodo: idMetodo, // Usamos id_metodo en lugar de metodo_pago
        id_porc: idPorc,
      };
    } else if (servicioData.sesiones === 2) {
      console.log(
        `El servicio tiene 2 sesiones. Buscando registros previos para paciente: ${nombrePaciente}, docId: ${docId}, servicio: ${servicio}`
      );
      const { data: existingRecord, error: existingError } = await supabase
        .from('dia_dia')
        .select('*')
        .eq('paciente', nombrePaciente)
        .eq('doc_id', docId)
        .eq('nombre_serv', servicio)
        .is('fecha_final', null)
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        console.error('Error al buscar registros previos:', existingError);
        const err = new Error('Error al buscar registros previos');
        err.statusCode = 500;
        throw err;
      }

      if (existingRecord) {
        console.log(
          `Registro previo encontrado (ID: ${existingRecord.id}). Actualizando su fecha_final con la nueva fecha_inicio: ${fecha}`
        );
        const { data: updatedRecord, error: updateError } = await supabase
          .from('dia_dia')
          .update({ fecha_final: fecha })
          .eq('id', existingRecord.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error al actualizar la fecha_final del registro previo:', updateError);
          const err = new Error('Error al actualizar el registro previo');
          err.statusCode = 500;
          throw err;
        }
        console.log('Fecha_final del registro previo actualizada exitosamente:', updatedRecord);

        responseData = {
          id: updatedRecord.id,
          nombreDoctor: updatedRecord.nombre_doc || updatedRecord.nombre_aux,
          nombrePaciente: updatedRecord.paciente,
          docId: updatedRecord.doc_id,
          servicio: updatedRecord.nombre_serv,
          abono: updatedRecord.abono,
          descuento: updatedRecord.dcto,
          total: updatedRecord.valor_total,
          fecha: updatedRecord.fecha_inicio,
          fechaFinal: updatedRecord.fecha_final,
          metodoPago: metodoPago, // Devolvemos el descpMetodo original
          idPorc: updatedRecord.id_porc,
        };
        statusCode = 200;
      } else {
        console.log('No se encontraron registros previos con fecha_final null. Este es el primer registro de 2 sesiones.');
        fechaFinal = null;

        recordData = {
          paciente: nombrePaciente,
          doc_id: docId,
          nombre_serv: servicio,
          abono: abono !== null ? abono : null,
          dcto: descuento !== null ? descuento : null,
          valor_total: valorTotal,
          fecha_inicio: fecha,
          fecha_final: fechaFinal,
          id_metodo: idMetodo, // Usamos id_metodo
          id_porc: idPorc,
        };
      }
    } else {
      console.log(`El servicio tiene ${servicioData.sesiones} sesiones. No se maneja en esta lógica.`);
      fechaFinal = null;

      recordData = {
        paciente: nombrePaciente,
        doc_id: docId,
        nombre_serv: servicio,
        abono: abono !== null ? abono : null,
        dcto: descuento !== null ? descuento : null,
        valor_total: valorTotal,
        fecha_inicio: fecha,
        fecha_final: fechaFinal,
        id_metodo: idMetodo, // Usamos id_metodo
        id_porc: idPorc,
      };
    }

    if (responseData) {
      res.status(statusCode).json(responseData);
      console.log('Respuesta enviada al cliente:', res.statusCode);
      return;
    }

    if (esAuxiliar) {
      console.log(`Asignando nombre_aux: ${nombreDoctor} (es auxiliar)`);
      recordData.nombre_aux = nombreDoctor;
      recordData.nombre_doc = null;
    } else {
      console.log(`Asignando nombre_doc: ${nombreDoctor} (es doctor)`);
      recordData.nombre_doc = nombreDoctor;
      recordData.nombre_aux = null;
    }

    console.log('Insertando registro en la tabla dia_dia con datos:', recordData);
    const { data, error } = await supabase
      .from('dia_dia')
      .insert([recordData])
      .select()
      .single();

    if (error) {
      console.error('Error al insertar el registro:', error);
      const err = new Error('Error al crear el registro');
      err.statusCode = 500;
      throw err;
    }
    console.log('Registro creado exitosamente:', data);

    res.status(statusCode).json({
      id: data.id,
      nombreDoctor: data.nombre_doc || data.nombre_aux,
      nombrePaciente: data.paciente,
      docId: data.doc_id,
      servicio: data.nombre_serv,
      abono: data.abono,
      descuento: data.dcto,
      total: data.valor_total,
      fecha: data.fecha_inicio,
      fechaFinal: data.fecha_final,
      metodoPago: metodoPago, // Devolvemos el descpMetodo original
      idPorc: data.id_porc,
    });
    console.log('Respuesta enviada al cliente:', res.statusCode);
  } catch (err) {
    console.error('Error en createRecord:', err.message);
    next(err);
  }
};

const getRecords = async (req, res, next) => {
  try {
    console.log('Iniciando getRecords');

    const { data, error } = await supabase
      .from('dia_dia')
      .select('*, Metodos_Pagos(descpMetodo)') // JOIN con Metodos_Pagos para obtener descpMetodo
      .order('fecha_inicio', { ascending: false });

    if (error) {
      console.error('Error al obtener los registros:', error);
      const err = new Error('Error al obtener los registros');
      err.statusCode = 500;
      throw err;
    }
    console.log(`Registros obtenidos: ${data.length} registros`);

    const formattedData = data.map((record) => {
      const formattedRecord = {
        id: record.id,
        nombreDoctor: record.nombre_doc || record.nombre_aux, // Mostrar doctor o auxiliar
        nombrePaciente: record.paciente,
        docId: record.doc_id,
        servicio: record.nombre_serv,
        abono: record.abono,
        descuento: record.dcto,
        total: record.valor_total,
        fecha: record.fecha_inicio,
        metodoPago: record.Metodos_Pagos.descpMetodo, // Usar descpMetodo desde la relación
        idPorc: record.id_porc,
        fechaFinal: record.fecha_final,
      };
      return formattedRecord;
    });
    console.log('Registros formateados:', formattedData);

    res.status(200).json(formattedData);
    console.log('Respuesta enviada al cliente:', res.statusCode);
  } catch (err) {
    console.error('Error en getRecords:', err.message);
    next(err);
  }
};
const deleteRecords = async (req, res, next) => {
  try {
    console.log('Iniciando deleteRecords con IDs:', req.body.ids);

    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      console.error('IDs inválidos:', ids);
      const err = new Error('Se requiere un array de IDs para eliminar');
      err.statusCode = 400;
      throw err;
    }

    const { error } = await supabase
      .from('dia_dia')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('Error al eliminar los registros:', error);
      const err = new Error('Error al eliminar los registros');
      err.statusCode = 500;
      throw err;
    }
    console.log(`Registros eliminados: ${ids.length} registros`);

    res.status(200).json({ message: 'Registros eliminados exitosamente' });
    console.log('Respuesta enviada al cliente:', res.statusCode);
  } catch (err) {
    console.error('Error en deleteRecords:', err.message);
    next(err);
  }
};

const createLiquidation = async (req, res, next) => {
  try {
    console.log('Iniciando createLiquidation con datos:', req.body);

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
      console.error('Error al guardar la liquidación:', error);
      const err = new Error('Error al guardar la liquidación');
      err.statusCode = 500;
      throw err;
    }
    console.log('Liquidación creada exitosamente:', data);

    res.status(201).json(data);
    console.log('Respuesta enviada al cliente:', res.statusCode);
  } catch (err) {
    console.error('Error en createLiquidation:', err.message);
    next(err);
  }
};

const getLiquidations = async (req, res, next) => {
  try {
    console.log('Iniciando getLiquidations');

    const { data, error } = await supabase
      .from('Historial_Liquidaciones')
      .select('*')
      .order('fecha_liquidacion', { ascending: false });

    if (error) {
      console.error('Error al obtener el historial de liquidaciones:', error);
      const err = new Error('Error al obtener el historial de liquidaciones');
      err.statusCode = 500;
      throw err;
    }
    console.log(`Liquidaciones obtenidas: ${data.length} liquidaciones`);

    res.status(200).json(data);
    console.log('Respuesta enviada al cliente:', res.statusCode);
  } catch (err) {
    console.error('Error en getLiquidations:', err.message);
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