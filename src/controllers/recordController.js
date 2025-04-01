const supabase = require('../config/supabase');

// /api/records
const createRecord = async (req, res, next) => {
  try {
    const {
      nombreDoctor,
      nombrePaciente,
      docId,
      servicio,
      abono,
      metodoPagoAbono,
      id_cuenta_abono,
      descuento,
      esPacientePropio,
      fecha,
      metodoPago,
      id_cuenta,
      esAuxiliar,
      valorPagado,
      montoPrestado,
      titularCredito,
      esDatáfono,
      esDatáfonoAbono,
      valor_total,
    } = req.body;

    const { data: servicioData, error: servicioError } = await supabase
      .from('Servicios')
      .select('valor, sesiones')
      .eq('nombre_serv', servicio)
      .single();

    if (servicioError || !servicioData) {
      const err = new Error('Servicio no encontrado');
      err.statusCode = 404;
      throw err;
    }

    let idMetodo = null;
    if (metodoPago) {
      const { data: metodoPagoData, error: metodoPagoError } = await supabase
        .from('Metodos_Pagos')
        .select('id_metodo')
        .eq('descpMetodo', metodoPago)
        .single();

      if (metodoPagoError || !metodoPagoData) {
        const err = new Error('Método de pago no encontrado');
        err.statusCode = 404;
        throw err;
      }
      idMetodo = metodoPagoData.id_metodo;
    }

    let idMetodoAbono = null;
    if (metodoPagoAbono) {
      const { data: metodoPagoAbonoData, error: metodoPagoAbonoError } = await supabase
        .from('Metodos_Pagos')
        .select('id_metodo')
        .eq('descpMetodo', metodoPagoAbono)
        .single();

      if (metodoPagoAbonoError || !metodoPagoAbonoData) {
        const err = new Error('Método de pago del abono no encontrado');
        err.statusCode = 404;
        throw err;
      }
      idMetodoAbono = metodoPagoAbonoData.id_metodo;
    }

    let idPorc;
    let porcentaje;
    if (esAuxiliar) {
      const { data: auxiliarData, error: auxiliarError } = await supabase
        .from('Auxiliares')
        .select('id_porc')
        .eq('nombre_aux', nombreDoctor)
        .single();

      if (auxiliarError || !auxiliarData) {
        const err = new Error('Auxiliar no encontrado');
        err.statusCode = 404;
        throw err;
      }
      idPorc = auxiliarData.id_porc;

      const { data: porcData, error: porcError } = await supabase
        .from('Porcentaje_pagos')
        .select('porcentaje')
        .eq('id_porc', idPorc)
        .single();

      if (porcError || !porcData) {
        const err = new Error('Porcentaje no encontrado');
        err.statusCode = 404;
        throw err;
      }
      porcentaje = porcData.porcentaje / 100;
    } else {
      idPorc = esPacientePropio ? 2 : 1;
      porcentaje = esPacientePropio ? 0.5 : 0.4;
    }

    let valorTotal = valor_total;
    let valorPagadoAjustado = valorTotal;

    if (metodoPago === 'Datáfono' && esDatáfono) {
      valorPagadoAjustado;
    }

    let finalIdCuenta = null;
    if (metodoPago === 'Transferencia' && id_cuenta) {
      finalIdCuenta = id_cuenta;
    }

    let finalIdCuentaAbono = null;
    if (metodoPagoAbono === 'Transferencia' && id_cuenta_abono) {
      finalIdCuentaAbono = id_cuenta_abono;
    }

    let fechaFinal = null;
    let recordData;
    let responseData;
    let statusCode = 201;

    if (servicioData.sesiones === 1) {
      let valorLiquidado = servicioData.valor;
      if (descuento !== null && descuento > 0) {
        valorLiquidado -= descuento;
      }
      if (abono !== null && abono > 0) {
        valorLiquidado -= abono;
      }
      if (valorPagado !== null && valorPagado > 0) {
        valorLiquidado -= valorPagado;
      }
      if (valorLiquidado < 0) {
        valorLiquidado = 0;
      }

      fechaFinal = fecha;

      recordData = {
        paciente: nombrePaciente,
        doc_id: docId,
        nombre_serv: servicio,
        abono: abono !== null ? abono : null,
        dcto: descuento !== null ? descuento : null,
        valor_total: valorTotal,
        valor_liquidado: valorLiquidado,
        valor_pagado: valorPagadoAjustado,
        fecha_inicio: fecha,
        fecha_final: fechaFinal,
        id_metodo: idMetodo,
        id_metodo_abono: idMetodoAbono,
        id_cuenta: finalIdCuenta,
        id_cuenta_abono: finalIdCuentaAbono,
        id_porc: idPorc,
        es_paciente_propio: esPacientePropio,
        monto_prestado: metodoPago === 'Crédito' ? montoPrestado : null,
        titular_credito: metodoPago === 'Crédito' ? titularCredito : null,
        es_datáfono: metodoPago === 'Datáfono' ? !!esDatáfono : false,
        es_datáfono_abono: metodoPagoAbono === 'Datáfono' ? !!esDatáfonoAbono : false,
      };
    } else if (servicioData.sesiones === 2) {
      const { data: existingRecord, error: existingError } = await supabase
        .from('dia_dia')
        .select('*')
        .eq('paciente', nombrePaciente)
        .eq('doc_id', docId)
        .eq('nombre_serv', servicio)
        .is('fecha_final', null)
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        const err = new Error('Error al buscar registros previos');
        err.statusCode = 500;
        throw err;
      }

      if (existingRecord) {
        let valorLiquidado = existingRecord.valor_liquidado;
        if (valorPagado !== null && valorPagado > 0) {
          valorLiquidado -= valorPagado;
        }
        if (valorLiquidado < 0) {
          valorLiquidado = 0;
        }

        let valorPagadoAjustadoUpdate = valorTotal;
        if (metodoPago === 'Datáfono' && esDatáfono) {
          valorPagadoAjustadoUpdate;
        }

        const updatedEsDatáfono = metodoPago ? (metodoPago === 'Datáfono' ? !!esDatáfono : false) : existingRecord.es_datáfono;
        const updatedEsDatáfonoAbono = metodoPagoAbono ? (metodoPagoAbono === 'Datáfono' ? !!esDatáfonoAbono : false) : existingRecord.es_datáfono_abono;

        const { data: updatedRecord, error: updateError } = await supabase
          .from('dia_dia')
          .update({
            fecha_final: fecha,
            valor_total: valorTotal,
            valor_liquidado: valorLiquidado,
            valor_pagado: valorPagadoAjustadoUpdate,
            id_metodo: idMetodo || existingRecord.id_metodo,
            id_cuenta: finalIdCuenta || existingRecord.id_cuenta,
            id_porc: idPorc,
            es_paciente_propio: esPacientePropio,
            monto_prestado: metodoPago === 'Crédito' ? montoPrestado : existingRecord.monto_prestado,
            titular_credito: metodoPago === 'Crédito' ? titularCredito : existingRecord.titular_credito,
            es_datáfono: updatedEsDatáfono,
            es_datáfono_abono: updatedEsDatáfonoAbono,
          })
          .eq('id', existingRecord.id)
          .select()
          .single();

        if (updateError) {
          const err = new Error('Error al actualizar el registro previo');
          err.statusCode = 500;
          throw err;
        }

        responseData = {
          id: updatedRecord.id,
          nombreDoctor: updatedRecord.nombre_doc || updatedRecord.nombre_aux,
          nombrePaciente: updatedRecord.paciente,
          docId: updatedRecord.doc_id,
          servicio: updatedRecord.nombre_serv,
          abono: updatedRecord.abono,
          metodoPagoAbono: metodoPagoAbono || existingRecord.metodoPagoAbono,
          id_cuenta_abono: updatedRecord.id_cuenta_abono,
          descuento: updatedRecord.dcto,
          valor_total: updatedRecord.valor_total,
          valor_liquidado: updatedRecord.valor_liquidado,
          valor_pagado: updatedRecord.valor_pagado,
          fecha: updatedRecord.fecha_inicio,
          fechaFinal: updatedRecord.fecha_final,
          metodoPago: metodoPago || existingRecord.metodoPago,
          id_cuenta: updatedRecord.id_cuenta,
          idPorc: updatedRecord.id_porc,
          montoPrestado: updatedRecord.monto_prestado,
          titularCredito: updatedRecord.titular_credito,
          esDatáfono: updatedRecord.es_datáfono,
          esDatáfonoAbono: updatedRecord.es_datáfono_abono,
        };
        statusCode = 200;
      } else {
        let valorLiquidado = servicioData.valor;
        if (descuento !== null && descuento > 0) {
          valorLiquidado -= descuento;
        }
        if (abono !== null && abono > 0) {
          valorLiquidado -= abono;
        }
        if (valorPagado !== null && valorPagado > 0) {
          valorLiquidado -= valorPagado;
        }
        if (valorLiquidado < 0) {
          valorLiquidado = 0;
        }

        fechaFinal = null;

        recordData = {
          paciente: nombrePaciente,
          doc_id: docId,
          nombre_serv: servicio,
          abono: abono !== null ? abono : null,
          dcto: descuento !== null ? descuento : null,
          valor_total: valorTotal,
          valor_liquidado: valorLiquidado,
          valor_pagado: valorPagadoAjustado,
          fecha_inicio: fecha,
          fecha_final: fechaFinal,
          id_metodo: idMetodo,
          id_metodo_abono: idMetodoAbono,
          id_cuenta: finalIdCuenta,
          id_cuenta_abono: finalIdCuentaAbono,
          id_porc: idPorc,
          es_paciente_propio: esPacientePropio,
          monto_prestado: metodoPago === 'Crédito' ? montoPrestado : null,
          titular_credito: metodoPago === 'Crédito' ? titularCredito : null,
          es_datáfono: metodoPago === 'Datáfono' ? !!esDatáfono : false,
          es_datáfono_abono: metodoPagoAbono === 'Datáfono' ? !!esDatáfonoAbono : false,
        };
      }
    } else {
      let valorLiquidado = servicioData.valor;
      if (descuento !== null && descuento > 0) {
        valorLiquidado -= descuento;
      }
      if (abono !== null && abono > 0) {
        valorLiquidado -= abono;
      }
      if (valorPagado !== null && valorPagado > 0) {
        valorLiquidado -= valorPagado;
      }
      if (valorLiquidado < 0) {
        valorLiquidado = 0;
      }

      fechaFinal = null;

      recordData = {
        paciente: nombrePaciente,
        doc_id: docId,
        nombre_serv: servicio,
        abono: abono !== null ? abono : null,
        dcto: descuento !== null ? descuento : null,
        valor_total: valorTotal,
        valor_liquidado: valorLiquidado,
        valor_pagado: valorPagadoAjustado,
        fecha_inicio: fecha,
        fecha_final: fechaFinal,
        id_metodo: idMetodo,
        id_metodo_abono: idMetodoAbono,
        id_cuenta: finalIdCuenta,
        id_cuenta_abono: finalIdCuentaAbono,
        id_porc: idPorc,
        es_paciente_propio: esPacientePropio,
        monto_prestado: metodoPago === 'Crédito' ? montoPrestado : null,
        titular_credito: metodoPago === 'Crédito' ? titularCredito : null,
        es_datáfono: metodoPago === 'Datáfono' ? !!esDatáfono : false,
        es_datáfono_abono: metodoPagoAbono === 'Datáfono' ? !!esDatáfonoAbono : false,
      };
    }

    if (responseData) {
      res.status(statusCode).json(responseData);
      return;
    }

    if (esAuxiliar) {
      recordData.nombre_aux = nombreDoctor;
      recordData.nombre_doc = null;
    } else {
      recordData.nombre_doc = nombreDoctor;
      recordData.nombre_aux = null;
    }

    const { data, error } = await supabase
      .from('dia_dia')
      .insert([recordData])
      .select()
      .single();

    if (error) {
      const err = new Error('Error al crear el registro');
      err.statusCode = 500;
      throw err;
    }

    res.status(statusCode).json({
      id: data.id,
      nombreDoctor: data.nombre_doc || data.nombre_aux,
      nombrePaciente: data.paciente,
      docId: data.doc_id,
      servicio: data.nombre_serv,
      abono: data.abono,
      metodoPagoAbono: metodoPagoAbono,
      id_cuenta_abono: data.id_cuenta_abono,
      descuento: data.dcto,
      valor_total: data.valor_total,
      valor_liquidado: data.valor_liquidado,
      valor_pagado: data.valor_pagado,
      fecha: data.fecha_inicio,
      fechaFinal: data.fecha_final,
      metodoPago: metodoPago,
      id_cuenta: data.id_cuenta,
      idPorc: data.id_porc,
      montoPrestado: data.monto_prestado,
      titularCredito: data.titular_credito,
      esDatáfono: data.es_datáfono,
      esDatáfonoAbono: data.es_datáfono_abono,
    });
  } catch (err) {
    next(err);
  }
};

const getRecords = async (req, res, next) => {
  try {
    const { id_sede } = req.query;

    if (!id_sede) {
      const err = new Error('El id_sede es requerido');
      err.statusCode = 400;
      throw err;
    }

    const sedeId = parseInt(id_sede, 10);

    if (isNaN(sedeId)) {
      const err = new Error('El id_sede debe ser un número válido');
      err.statusCode = 400;
      throw err;
    }

    const { data: doctores, error: doctoresError } = await supabase
      .from('Doctores')
      .select('nombre_doc')
      .eq('id_sede', sedeId);

    if (doctoresError) {
      const err = new Error('Error al obtener los doctores');
      err.statusCode = 500;
      throw err;
    }

    const nombresDoctores = doctores.map(doctor => doctor.nombre_doc);

    const { data: auxiliares, error: auxiliaresError } = await supabase
      .from('Auxiliares')
      .select('nombre_aux')
      .eq('id_sede', sedeId);

    if (auxiliaresError) {
      const err = new Error('Error al obtener los auxiliares');
      err.statusCode = 500;
      throw err;
    }

    const nombresAuxiliares = auxiliares.map(auxiliar => auxiliar.nombre_aux);

    let doctorRecords = [];
    if (nombresDoctores.length > 0) {
      const { data, error } = await supabase
        .from('dia_dia')
        .select(`
          *,
          MetodoPagoPrincipal:Metodos_Pagos!dia_dia_id_metodo_fkey(descpMetodo),
          MetodoPagoAbono:Metodos_Pagos!dia_dia_id_metodo_abono_fkey(descpMetodo:descpMetodo),
          Servicio:Servicios!dia_dia_nombre_serv_fkey(sesiones)
        `)
        .not('nombre_doc', 'is', null)
        .in('nombre_doc', nombresDoctores)
        .order('fecha_inicio', { ascending: false });

      if (error) {
        const err = new Error('Error al obtener los registros de doctores');
        err.statusCode = 500;
        throw err;
      }
      doctorRecords = data;
    }

    let auxRecords = [];
    if (nombresAuxiliares.length > 0) {
      const { data, error } = await supabase
        .from('dia_dia')
        .select(`
          *,
          MetodoPagoPrincipal:Metodos_Pagos!dia_dia_id_metodo_fkey(descpMetodo),
          MetodoPagoAbono:Metodos_Pagos!dia_dia_id_metodo_abono_fkey(descpMetodo:descpMetodo),
          Servicio:Servicios!dia_dia_nombre_serv_fkey(sesiones)
        `)
        .not('nombre_aux', 'is', null)
        .in('nombre_aux', nombresAuxiliares)
        .order('fecha_inicio', { ascending: false });

      if (error) {
        const err = new Error('Error al obtener los registros de auxiliares');
        err.statusCode = 500;
        throw err;
      }
      auxRecords = data;
    }

    const data = [...doctorRecords, ...auxRecords];

    const formattedData = data.map((record) => ({
      id: record.id,
      nombreDoctor: record.nombre_doc || record.nombre_aux,
      nombrePaciente: record.paciente,
      docId: record.doc_id,
      servicio: record.nombre_serv,
      abono: record.abono ?? 0,
      descuento: record.dcto ?? 0,
      valor_total: record.valor_total ?? 0,
      fecha: record.fecha_inicio,
      fechaFinal: record.fecha_final,
      metodoPago: record.MetodoPagoPrincipal ? record.MetodoPagoPrincipal.descpMetodo : null,
      metodoPagoAbono: record.MetodoPagoAbono ? record.MetodoPagoAbono.descpMetodo : null,
      idPorc: record.id_porc,
      valor_liquidado: record.valor_liquidado,
      valor_pagado: record.valor_pagado ?? 0,
      id_cuenta: record.id_cuenta,
      id_cuenta_abono: record.id_cuenta_abono,
      esPacientePropio: record.es_paciente_propio,
      sesiones: record.Servicio ? record.Servicio.sesiones : 1,
      montoPrestado: record.monto_prestado,
      titularCredito: record.titular_credito,
      esDatáfono: record.es_datáfono,
      esDatáfonoAbono: record.es_datáfono_abono,
    }));

    res.status(200).json(formattedData);
  } catch (err) {
    next(err);
  }
};

const deleteRecords = async (req, res, next) => {
  try {
    const { ids } = req.body;

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

    if (!doctor || !fechaInicio || !fechaFin || !servicios || totalLiquidado === undefined || !fechaLiquidacion) {
      const err = new Error('Faltan datos requeridos para crear la liquidación');
      err.statusCode = 400;
      throw err;
    }

    let nombreDoc = null;
    let nombreAux = null;

    const { data: doctorExists, error: doctorError } = await supabase
      .from('Doctores')
      .select('nombre_doc')
      .eq('nombre_doc', doctor)
      .single();

    if (doctorError && doctorError.code !== 'PGRST116') {
      const err = new Error('Error al verificar el doctor');
      err.statusCode = 500;
      throw err;
    }

    if (doctorExists) {
      nombreDoc = doctor;
    } else {
      const { data: auxiliarExists, error: auxiliarError } = await supabase
        .from('Auxiliares')
        .select('nombre_aux')
        .eq('nombre_aux', doctor)
        .single();

      if (auxiliarError && auxiliarError.code !== 'PGRST116') {
        const err = new Error('Error al verificar el auxiliar');
        err.statusCode = 500;
        throw err;
      }

      if (auxiliarExists) {
        nombreAux = doctor;
      } else {
        const err = new Error(`El nombre "${doctor}" no está registrado ni en la tabla Doctores ni en la tabla Auxiliares.`);
        err.statusCode = 400;
        throw err;
      }
    }

    const registrosAplanados = servicios.flat();
    const idsServicios = registrosAplanados.map(servicio => servicio.id);

    const { data: registros, error: registrosError } = await supabase
      .from('dia_dia')
      .select('*, Porcentaje_pagos!id_porc(id_porc, porcentaje)')
      .in('id', idsServicios);

    if (registrosError) {
      const err = new Error('Error al consultar los registros para liquidar');
      err.statusCode = 500;
      throw err;
    }

    if (!registros || registros.length !== idsServicios.length) {
      const err = new Error('Algunos registros no fueron encontrados');
      err.statusCode = 404;
      throw err;
    }

    const sumaValorTotal = registros.reduce((sum, record) => sum + (record.valor_total || 0), 0);
    const liquidaciones = await Promise.all(
      registros.map(async (record) => {
        if (!record.paciente) {
          throw new Error('El campo paciente no puede ser null');
        }

        if (!record.Porcentaje_pagos || !record.Porcentaje_pagos.id_porc) {
          throw new Error('El campo id_porc no puede ser null. Asegúrate de que todos los registros en dia_dia tengan un id_porc válido.');
        }

        let auxName = null;
        if (record.nombre_aux) {
          const { data: auxExists, error: auxError } = await supabase
            .from('Auxiliares')
            .select('nombre_aux')
            .eq('nombre_aux', record.nombre_aux)
            .single();

          if (auxError && auxError.code !== 'PGRST116') {
            throw new Error('Error al verificar el auxiliar');
          }

          if (auxExists) {
            auxName = record.nombre_aux;
          }
        }

        const valorPagadoLiquidado = sumaValorTotal > 0
          ? (record.valor_total / sumaValorTotal) * totalLiquidado
          : totalLiquidado / registros.length;

        return {
          paciente: record.paciente,
          doc_id: record.doc_id || 0,
          nombre_doc: nombreDoc,
          nombre_serv: record.nombre_serv,
          fecha_inicio: fechaInicio,
          fecha_final: fechaFin,
          fecha_liquidacion: fechaLiquidacion,
          abono: record.abono || 0,
          id_porc: record.Porcentaje_pagos.id_porc,
          id_metodo: record.id_metodo || null,
          dcto: record.dcto || 0,
          valor_total: record.valor_total || 0,
          es_paciente_propio: record.es_paciente_propio || false,
          nombre_aux: nombreAux || auxName,
          id_cuenta: record.id_cuenta || null,
          id_cuenta_abono: record.id_cuenta_abono || null,
          id_metodo_abono: record.id_metodo_abono || null,
          valor_pagado: valorPagadoLiquidado,
          monto_prestado: record.monto_prestado,
          titular_credito: record.titular_credito,
          es_datáfono: record.es_datáfono,
          es_datáfono_abono: record.es_datáfono_abono,
        };
      })
    );

    const { data: liquidacionesInsertadas, error: insertError } = await supabase
      .from('Historial_Liquidacion')
      .insert(liquidaciones)
      .select();

    if (insertError) {
      const err = new Error('Error al guardar las liquidaciones');
      err.statusCode = 500;
      throw err;
    }

    res.status(201).json(liquidacionesInsertadas);
  } catch (err) {
    next(err);
  }
};

const getLiquidations = async (req, res, next) => {
  try {
    const { id_sede } = req.query;

    if (!id_sede) {
      const err = new Error('El id_sede es requerido');
      err.statusCode = 400;
      throw err;
    }

    const sedeId = parseInt(id_sede, 10);

    if (isNaN(sedeId)) {
      const err = new Error('El id_sede debe ser un número válido');
      err.statusCode = 400;
      throw err;
    }

    const { data: doctores, error: doctoresError } = await supabase
      .from('Doctores')
      .select('nombre_doc')
      .eq('id_sede', sedeId);

    if (doctoresError) {
      const err = new Error('Error al obtener los doctores');
      err.statusCode = 500;
      throw err;
    }

    const nombresDoctores = doctores.map(doctor => doctor.nombre_doc);

    const { data: auxiliares, error: auxiliaresError } = await supabase
      .from('Auxiliares')
      .select('nombre_aux')
      .eq('id_sede', sedeId);

    if (auxiliaresError) {
      const err = new Error('Error al obtener los auxiliares');
      err.statusCode = 500;
      throw err;
    }

    const nombresAuxiliares = auxiliares.map(auxiliar => auxiliar.nombre_aux);

    let doctorLiquidations = [];
    if (nombresDoctores.length > 0) {
      const { data, error } = await supabase
        .from('Historial_Liquidacion')
        .select(`
          *,
          MetodoPagoPrincipal:Metodos_Pagos!Historial_Liquidacion_id_metodo_fkey(descpMetodo),
          MetodoPagoAbono:Metodos_Pagos!Historial_Liquidacion_id_metodo_abono_fkey(descpMetodo),
          Porcentaje_pagos!id_porc(porcentaje)
        `)
        .not('nombre_doc', 'is', null)
        .in('nombre_doc', nombresDoctores)
        .order('fecha_inicio', { ascending: false });

      if (error) {
        const err = new Error('Error al obtener las liquidaciones de doctores');
        err.statusCode = 500;
        throw err;
      }
      doctorLiquidations = data;
    }

    let auxLiquidations = [];
    if (nombresAuxiliares.length > 0) {
      const { data, error } = await supabase
        .from('Historial_Liquidacion')
        .select(`
          *,
          MetodoPagoPrincipal:Metodos_Pagos!Historial_Liquidacion_id_metodo_fkey(descpMetodo),
          MetodoPagoAbono:Metodos_Pagos!Historial_Liquidacion_id_metodo_abono_fkey(descpMetodo),
          Porcentaje_pagos!id_porc(porcentaje)
        `)
        .not('nombre_aux', 'is', null)
        .in('nombre_aux', nombresAuxiliares)
        .order('fecha_inicio', { ascending: false });

      if (error) {
        const err = new Error('Error al obtener las liquidaciones de auxiliares');
        err.statusCode = 500;
        throw err;
      }
      auxLiquidations = data;
    }

    const rawLiquidations = [...doctorLiquidations, ...auxLiquidations];

    const groupedLiquidations = rawLiquidations.reduce((acc, record) => {
      const key = `${record.nombre_doc || record.nombre_aux}_${record.fecha_inicio}_${record.fecha_final}_${record.fecha_liquidacion}`;
      if (!acc[key]) {
        acc[key] = {
          doctor: record.nombre_doc || record.nombre_aux,
          fecha_inicio: record.fecha_inicio,
          fecha_final: record.fecha_final,
          fecha_liquidacion: record.fecha_liquidacion,
          servicios: [],
          total_liquidado: 0,
        };
      }
      acc[key].servicios.push({
        paciente: record.paciente,
        nombre_doc: record.nombre_doc,
        nombre_serv: record.nombre_serv,
        nombre_aux: record.nombre_aux,
        abono: record.abono,
        id_porc: record.id_porc,
        porcentaje: record.Porcentaje_pagos ? record.Porcentaje_pagos.porcentaje : null,
        id_metodo: record.id_metodo,
        metodoPago: record.MetodoPagoPrincipal ? record.MetodoPagoPrincipal.descpMetodo : null,
        id_metodo_abono: record.id_metodo_abono,
        metodoPagoAbono: record.MetodoPagoAbono ? record.MetodoPagoAbono.descpMetodo : null,
        dcto: record.dcto,
        valor_total: record.valor_total,
        es_paciente_propio: record.es_paciente_propio,
        id_cuenta: record.id_cuenta,
        id_cuenta_abono: record.id_cuenta_abono,
        valor_pagado: record.valor_pagado,
        monto_prestado: record.monto_prestado,
        titular_credito: record.titular_credito,
        es_datáfono: record.es_datáfono,
        es_datáfono_abono: record.es_datáfono_abono,
      });
      acc[key].total_liquidado += record.valor_pagado;
      return acc;
    }, {});

    const liquidations = Object.keys(groupedLiquidations).map((key, index) => ({
      id: `group_${index}`,
      ...groupedLiquidations[key],
    }));

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    });

    res.status(200).json(liquidations);
  } catch (err) {
    next(err);
  }
};

const deleteLiquidations = async (req, res, next) => {
  try {
    const { groups } = req.body;

    if (!groups || !Array.isArray(groups) || groups.length === 0) {
      const err = new Error('Se requiere un array de grupos para eliminar');
      err.statusCode = 400;
      throw err;
    }

    for (const group of groups) {
      const { doctor, fecha_inicio, fecha_final, fecha_liquidacion } = group;

      if (!doctor || !fecha_inicio || !fecha_final || !fecha_liquidacion) {
        const err = new Error('Faltan datos requeridos en uno de los grupos');
        err.statusCode = 400;
        throw err;
      }

      const { data: doctorExists } = await supabase
        .from('Doctores')
        .select('nombre_doc')
        .eq('nombre_doc', doctor)
        .single();

      const isDoctor = !!doctorExists;

      const { error } = await supabase
        .from('Historial_Liquidacion')
        .delete()
        .eq(isDoctor ? 'nombre_doc' : 'nombre_aux', doctor)
        .eq('fecha_inicio', fecha_inicio)
        .eq('fecha_final', fecha_final)
        .eq('fecha_liquidacion', fecha_liquidacion);

      if (error) {
        const err = new Error('Error al eliminar las liquidaciones');
        err.statusCode = 500;
        throw err;
      }
    }

    res.status(200).json({ message: 'Liquidaciones eliminadas exitosamente' });
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
  deleteLiquidations,
};