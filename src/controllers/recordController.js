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
      metodoPagoAbono, // Método de pago para el abono
      id_cuenta_abono, // Cuenta para el abono (si metodoPagoAbono es "Transferencia")
      descuento,
      esPacientePropio,
      fecha,
      metodoPago, // Este será el descpMetodo seleccionado desde el frontend
      id_cuenta, // Cuenta para el valor pagado (si metodoPago es "Transferencia")
      esAuxiliar,
      valorPagado, // Valor pagado para calcular valor_liquidado y guardar en valor_pagado
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

    // Buscar el id_metodo basado en el descpMetodo recibido (para el valor pagado)
    let idMetodo = null;
    if (metodoPago) {
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
      idMetodo = metodoPagoData.id_metodo;
      console.log(`id_metodo encontrado: ${idMetodo}`);
    }

    // Buscar el id_metodo para el abono (si aplica)
    let idMetodoAbono = null;
    if (metodoPagoAbono) {
      console.log(`Buscando id_metodo para el método de pago del abono: ${metodoPagoAbono} en la tabla Metodos_Pagos`);
      const { data: metodoPagoAbonoData, error: metodoPagoAbonoError } = await supabase
        .from('Metodos_Pagos')
        .select('id_metodo')
        .eq('descpMetodo', metodoPagoAbono)
        .single();

      if (metodoPagoAbonoError || !metodoPagoAbonoData) {
        console.error('Error al buscar el método de pago del abono:', metodoPagoAbonoError);
        const err = new Error('Método de pago del abono no encontrado');
        err.statusCode = 404;
        throw err;
      }
      idMetodoAbono = metodoPagoAbonoData.id_metodo;
      console.log(`id_metodo para el abono encontrado: ${idMetodoAbono}`);
    }

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

    // Calcular el valor_total (ajustado si hay descuento)
    let valorTotal = servicioData.valor;
    if (descuento !== null && descuento > 0) {
      valorTotal -= descuento;
      console.log(`Aplicando descuento de ${descuento}. Nuevo valor_total: ${valorTotal}`);
    }
    console.log(`Valor total final (después de descuento, si aplica): ${valorTotal}`);

    // Determinar el id_cuenta a usar (solo si metodoPago es "Transferencia")
    let finalIdCuenta = null;
    if (metodoPago === 'Transferencia' && id_cuenta) {
      finalIdCuenta = id_cuenta;
      console.log(`Asignando id_cuenta: ${finalIdCuenta} (usado para el valor pagado)`);
    }

    // Determinar el id_cuenta_abono a usar (solo si metodoPagoAbono es "Transferencia")
    let finalIdCuentaAbono = null;
    if (metodoPagoAbono === 'Transferencia' && id_cuenta_abono) {
      finalIdCuentaAbono = id_cuenta_abono;
      console.log(`Asignando id_cuenta_abono: ${finalIdCuentaAbono} (usado para el abono)`);
    }

    let fechaFinal = null;
    let recordData;
    let responseData;
    let statusCode = 201;

    if (servicioData.sesiones === 1) {
      // Calcular valor_liquidado para la primera sesión o servicios de 1 sesión
      let valorLiquidado = servicioData.valor; // Usamos el valor original del servicio para valor_liquidado
      console.log(`Valor liquidado inicial (valor original del servicio): ${valorLiquidado}`);
      if (descuento !== null && descuento > 0) {
        valorLiquidado -= descuento;
        console.log(`Aplicando descuento de ${descuento}. Nuevo valor liquidado: ${valorLiquidado}`);
      }
      if (abono !== null && abono > 0) {
        valorLiquidado -= abono;
        console.log(`Aplicando abono de ${abono}. Nuevo valor liquidado: ${valorLiquidado}`);
      }
      if (valorPagado !== null && valorPagado > 0) {
        valorLiquidado -= valorPagado;
        console.log(`Aplicando valor pagado de ${valorPagado}. Nuevo valor liquidado: ${valorLiquidado}`);
      }
      if (valorLiquidado < 0) {
        console.log('Valor liquidado negativo, ajustando a 0');
        valorLiquidado = 0;
      }
      console.log(`Valor liquidado final: ${valorLiquidado}`);

      console.log('El servicio tiene 1 sesión. Asignando fecha_final igual a fecha_inicio:', fecha);
      fechaFinal = fecha;

      recordData = {
        paciente: nombrePaciente,
        doc_id: docId,
        nombre_serv: servicio,
        abono: abono !== null ? abono : null,
        dcto: descuento !== null ? descuento : null,
        valor_total: valorTotal, // Usamos el valor_total ajustado
        valor_liquidado: valorLiquidado,
        valor_pagado: valorPagado !== null ? valorPagado : null, // Guardamos el valor_pagado
        fecha_inicio: fecha,
        fecha_final: fechaFinal,
        id_metodo: idMetodo,
        id_metodo_abono: idMetodoAbono,
        id_cuenta: finalIdCuenta,
        id_cuenta_abono: finalIdCuentaAbono,
        id_porc: idPorc,
        es_paciente_propio: esPacientePropio,
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
          `Registro previo encontrado (ID: ${existingRecord.id}). Actualizando su fecha_final y otros campos con los nuevos valores.`
        );

        // Calcular el nuevo valor_liquidado basado en el valor_liquidado existente
        let valorLiquidado = existingRecord.valor_liquidado;
        console.log(`Valor liquidado existente (de la primera sesión): ${valorLiquidado}`);
        if (valorPagado !== null && valorPagado > 0) {
          valorLiquidado -= valorPagado;
          console.log(`Aplicando valor pagado de ${valorPagado}. Nuevo valor liquidado: ${valorLiquidado}`);
        }
        if (valorLiquidado < 0) {
          console.log('Valor liquidado negativo, ajustando a 0');
          valorLiquidado = 0;
        }
        console.log(`Valor liquidado final: ${valorLiquidado}`);

        // Actualizar el registro existente sin sobrescribir abono, dcto, id_cuenta_abono ni id_metodo_abono
        const { data: updatedRecord, error: updateError } = await supabase
          .from('dia_dia')
          .update({
            fecha_final: fecha,
            valor_total: valorTotal, // Usamos el valor_total ajustado
            valor_liquidado: valorLiquidado,
            valor_pagado: valorPagado !== null ? valorPagado : null, // Actualizamos el valor_pagado
            id_metodo: idMetodo,
            id_cuenta: finalIdCuenta,
            id_porc: idPorc,
            es_paciente_propio: esPacientePropio,
          })
          .eq('id', existingRecord.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error al actualizar el registro previo:', updateError);
          const err = new Error('Error al actualizar el registro previo');
          err.statusCode = 500;
          throw err;
        }
        console.log('Registro previo actualizado exitosamente:', updatedRecord);

        responseData = {
          id: updatedRecord.id,
          nombreDoctor: updatedRecord.nombre_doc || updatedRecord.nombre_aux,
          nombrePaciente: updatedRecord.paciente,
          docId: updatedRecord.doc_id,
          servicio: updatedRecord.nombre_serv,
          abono: updatedRecord.abono,
          metodoPagoAbono: metodoPagoAbono,
          id_cuenta_abono: updatedRecord.id_cuenta_abono,
          descuento: updatedRecord.dcto,
          valor_total: updatedRecord.valor_total,
          valor_liquidado: updatedRecord.valor_liquidado,
          valor_pagado: updatedRecord.valor_pagado, // Incluimos valor_pagado en la respuesta
          fecha: updatedRecord.fecha_inicio,
          fechaFinal: updatedRecord.fecha_final,
          metodoPago: metodoPago,
          id_cuenta: updatedRecord.id_cuenta,
          idPorc: updatedRecord.id_porc,
        };
        statusCode = 200;
      } else {
        // Calcular valor_liquidado para la primera sesión
        let valorLiquidado = servicioData.valor; // Usamos el valor original del servicio para valor_liquidado
        console.log(`Valor liquidado inicial (valor original del servicio): ${valorLiquidado}`);
        if (descuento !== null && descuento > 0) {
          valorLiquidado -= descuento;
          console.log(`Aplicando descuento de ${descuento}. Nuevo valor liquidado: ${valorLiquidado}`);
        }
        if (abono !== null && abono > 0) {
          valorLiquidado -= abono;
          console.log(`Aplicando abono de ${abono}. Nuevo valor liquidado: ${valorLiquidado}`);
        }
        if (valorPagado !== null && valorPagado > 0) {
          valorLiquidado -= valorPagado;
          console.log(`Aplicando valor pagado de ${valorPagado}. Nuevo valor liquidado: ${valorLiquidado}`);
        }
        if (valorLiquidado < 0) {
          console.log('Valor liquidado negativo, ajustando a 0');
          valorLiquidado = 0;
        }
        console.log(`Valor liquidado final: ${valorLiquidado}`);

        console.log('No se encontraron registros previos con fecha_final null. Este es el primer registro de 2 sesiones.');
        fechaFinal = null;

        recordData = {
          paciente: nombrePaciente,
          doc_id: docId,
          nombre_serv: servicio,
          abono: abono !== null ? abono : null,
          dcto: descuento !== null ? descuento : null,
          valor_total: valorTotal, // Usamos el valor_total ajustado
          valor_liquidado: valorLiquidado,
          valor_pagado: valorPagado !== null ? valorPagado : null, // Guardamos el valor_pagado
          fecha_inicio: fecha,
          fecha_final: fechaFinal,
          id_metodo: idMetodo,
          id_metodo_abono: idMetodoAbono,
          id_cuenta: finalIdCuenta,
          id_cuenta_abono: finalIdCuentaAbono,
          id_porc: idPorc,
          es_paciente_propio: esPacientePropio,
        };
      }
    } else {
      // Calcular valor_liquidado para servicios con más de 2 sesiones
      let valorLiquidado = servicioData.valor; // Usamos el valor original del servicio para valor_liquidado
      console.log(`Valor liquidado inicial (valor original del servicio): ${valorLiquidado}`);
      if (descuento !== null && descuento > 0) {
        valorLiquidado -= descuento;
        console.log(`Aplicando descuento de ${descuento}. Nuevo valor liquidado: ${valorLiquidado}`);
      }
      if (abono !== null && abono > 0) {
        valorLiquidado -= abono;
        console.log(`Aplicando abono de ${abono}. Nuevo valor liquidado: ${valorLiquidado}`);
      }
      if (valorPagado !== null && valorPagado > 0) {
        valorLiquidado -= valorPagado;
        console.log(`Aplicando valor pagado de ${valorPagado}. Nuevo valor liquidado: ${valorLiquidado}`);
      }
      if (valorLiquidado < 0) {
        console.log('Valor liquidado negativo, ajustando a 0');
        valorLiquidado = 0;
      }
      console.log(`Valor liquidado final: ${valorLiquidado}`);

      console.log(`El servicio tiene ${servicioData.sesiones} sesiones. No se maneja en esta lógica.`);
      fechaFinal = null;

      recordData = {
        paciente: nombrePaciente,
        doc_id: docId,
        nombre_serv: servicio,
        abono: abono !== null ? abono : null,
        dcto: descuento !== null ? descuento : null,
        valor_total: valorTotal, // Usamos el valor_total ajustado
        valor_liquidado: valorLiquidado,
        valor_pagado: valorPagado !== null ? valorPagado : null, // Guardamos el valor_pagado
        fecha_inicio: fecha,
        fecha_final: fechaFinal,
        id_metodo: idMetodo,
        id_metodo_abono: idMetodoAbono,
        id_cuenta: finalIdCuenta,
        id_cuenta_abono: finalIdCuentaAbono,
        id_porc: idPorc,
        es_paciente_propio: esPacientePropio,
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
      metodoPagoAbono: metodoPagoAbono,
      id_cuenta_abono: data.id_cuenta_abono,
      descuento: data.dcto,
      valor_total: data.valor_total,
      valor_liquidado: data.valor_liquidado,
      valor_pagado: data.valor_pagado, // Incluimos valor_pagado en la respuesta
      fecha: data.fecha_inicio,
      fechaFinal: data.fecha_final,
      metodoPago: metodoPago,
      id_cuenta: data.id_cuenta,
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

    const { id_sede } = req.query;
    console.log('id_sede recibido:', id_sede);

    if (!id_sede) {
      console.log('Error: id_sede no proporcionado');
      const err = new Error('El id_sede es requerido');
      err.statusCode = 400;
      throw err;
    }

    const sedeId = parseInt(id_sede, 10);
    console.log('id_sede convertido a número:', sedeId);

    if (isNaN(sedeId)) {
      console.log('Error: id_sede no es un número válido');
      const err = new Error('El id_sede debe ser un número válido');
      err.statusCode = 400;
      throw err;
    }

    console.log('Consultando doctores para id_sede:', sedeId);
    const { data: doctores, error: doctoresError } = await supabase
      .from('Doctores')
      .select('nombre_doc')
      .eq('id_sede', sedeId);

    if (doctoresError) {
      console.error('Error al obtener los doctores:', doctoresError);
      const err = new Error('Error al obtener los doctores');
      err.statusCode = 500;
      throw err;
    }
    console.log('Doctores obtenidos:', doctores);

    const nombresDoctores = doctores.map(doctor => doctor.nombre_doc);
    console.log('Nombres de doctores:', nombresDoctores);

    console.log('Consultando auxiliares para id_sede:', sedeId);
    const { data: auxiliares, error: auxiliaresError } = await supabase
      .from('Auxiliares')
      .select('nombre_aux')
      .eq('id_sede', sedeId);

    if (auxiliaresError) {
      console.error('Error al obtener los auxiliares:', auxiliaresError);
      const err = new Error('Error al obtener los auxiliares');
      err.statusCode = 500;
      throw err;
    }
    console.log('Auxiliares obtenidos:', auxiliares);

    const nombresAuxiliares = auxiliares.map(auxiliar => auxiliar.nombre_aux);
    console.log('Nombres de auxiliares:', nombresAuxiliares);

    let doctorRecords = [];
    if (nombresDoctores.length > 0) {
      console.log('Consultando registros de dia_dia para doctores con nombres:', nombresDoctores);
      const { data, error } = await supabase
        .from('dia_dia')
        .select(`
          *,
          MetodoPagoPrincipal:Metodos_Pagos!dia_dia_id_metodo_fkey(descpMetodo),
          MetodoPagoAbono:Metodos_Pagos!dia_dia_id_metodo_abono_fkey(descpMetodo:descpMetodo)
        `)
        .not('nombre_doc', 'is', null)
        .in('nombre_doc', nombresDoctores)
        .order('fecha_inicio', { ascending: false });

      if (error) {
        console.error('Error al obtener los registros de doctores:', error);
        const err = new Error('Error al obtener los registros de doctores');
        err.statusCode = 500;
        throw err;
      }
      console.log('Datos crudos de dia_dia (doctores):', data);
      // Agregar un log específico para el registro con id 35
      const record35 = data.find(record => record.id === 35);
      if (record35) {
        console.log('Registro con id 35 (crudo):', record35);
        console.log('MetodoPagoAbono para id 35:', record35.MetodoPagoAbono);
      }
      doctorRecords = data;
    } else {
      console.log('No hay doctores para esta sede, omitiendo consulta de registros de doctores');
    }

    let auxRecords = [];
    if (nombresAuxiliares.length > 0) {
      console.log('Consultando registros de dia_dia para auxiliares con nombres:', nombresAuxiliares);
      const { data, error } = await supabase
        .from('dia_dia')
        .select(`
          *,
          MetodoPagoPrincipal:Metodos_Pagos!dia_dia_id_metodo_fkey(descpMetodo),
          MetodoPagoAbono:Metodos_Pagos!dia_dia_id_metodo_abono_fkey(descpMetodo:descpMetodo)
        `)
        .not('nombre_aux', 'is', null)
        .in('nombre_aux', nombresAuxiliares)
        .order('fecha_inicio', { ascending: false });

      if (error) {
        console.error('Error al obtener los registros de auxiliares:', error);
        const err = new Error('Error al obtener los registros de auxiliares');
        err.statusCode = 500;
        throw err;
      }
      console.log('Datos crudos de dia_dia (auxiliares):', data);
      // Agregar un log específico para el registro con id 35
      const record35 = data.find(record => record.id === 35);
      if (record35) {
        console.log('Registro con id 35 (crudo):', record35);
        console.log('MetodoPagoAbono para id 35:', record35.MetodoPagoAbono);
      }
      auxRecords = data;
    } else {
      console.log('No hay auxiliares para esta sede, omitiendo consulta de registros de auxiliares');
    }

    const data = [...doctorRecords, ...auxRecords];
    console.log(`Registros totales obtenidos (doctores + auxiliares): ${data.length} registros`, data);

    console.log('Formateando los registros...');
    const formattedData = data.map((record) => {
      const formattedRecord = {
        id: record.id,
        nombreDoctor: record.nombre_doc || record.nombre_aux,
        nombrePaciente: record.paciente,
        docId: record.doc_id,
        servicio: record.nombre_serv,
        abono: record.abono ?? 0,
        descuento: record.dcto ?? 0,
        valor_total: record.valor_total ?? 0,
        fecha: record.fecha_inicio,
        metodoPago: record.MetodoPagoPrincipal ? record.MetodoPagoPrincipal.descpMetodo : null,
        metodoPagoAbono: record.MetodoPagoAbono ? record.MetodoPagoAbono.descpMetodo : null,
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
    console.error('Stack del error:', err.stack);
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

    // Validar que los datos necesarios estén presentes
    if (!doctor || !fechaInicio || !fechaFin || !servicios || totalLiquidado === undefined || !fechaLiquidacion) {
      console.error('Datos incompletos:', req.body);
      const err = new Error('Faltan datos requeridos para crear la liquidación');
      err.statusCode = 400;
      throw err;
    }

    // Verificar que los servicios enviados cumplen con los criterios de liquidación
    const idsServicios = servicios.map(servicio => servicio.id);
    console.log('IDs de servicios a liquidar:', idsServicios);

    // Consultar los registros en dia_dia para validar que cumplen con los criterios
    const { data: registros, error: registrosError } = await supabase
      .from('dia_dia')
      .select('*, Porcentajes!id_porc(porcentaje)') // Incluimos el porcentaje desde la tabla Porcentajes
      .in('id', idsServicios);

    if (registrosError) {
      console.error('Error al consultar los registros en dia_dia:', registrosError);
      const err = new Error('Error al consultar los registros para liquidar');
      err.statusCode = 500;
      throw err;
    }

    if (!registros || registros.length !== idsServicios.length) {
      console.error('No se encontraron todos los registros para los IDs proporcionados:', idsServicios);
      const err = new Error('Algunos registros no fueron encontrados');
      err.statusCode = 404;
      throw err;
    }

    // Validar que todos los registros cumplen con los criterios de liquidación
    const invalidRecords = registros.filter(record => !record.fecha_final || record.valor_liquidado !== 0);
    if (invalidRecords.length > 0) {
      console.error('Registros no válidos para liquidación:', invalidRecords);
      const err = new Error('Algunos registros no cumplen con los criterios para liquidación (fecha_final no null y valor_liquidado = 0)');
      err.statusCode = 400;
      throw err;
    }

    // Calcular el valor a liquidar para cada registro usando el porcentaje de id_porc
    const updatedRecords = registros.map(record => {
      const porcentaje = record.Porcentajes.porcentaje / 100; // Obtenemos el porcentaje desde la tabla Porcentajes
      const valorLiquidado = record.valor_total * porcentaje;
      return {
        id: record.id,
        valor_liquidado: valorLiquidado,
      };
    });

    // Actualizar los registros en dia_dia con el valor_liquidado calculado
    const updatePromises = updatedRecords.map(record =>
      supabase
        .from('dia_dia')
        .update({ valor_liquidado: record.valor_liquidado })
        .eq('id', record.id)
    );

    const updateResults = await Promise.all(updatePromises);
    const updateErrors = updateResults.filter(result => result.error);
    if (updateErrors.length > 0) {
      console.error('Error al actualizar valor_liquidado en dia_dia:', updateErrors);
      const err = new Error('Error al actualizar los registros liquidados');
      err.statusCode = 500;
      throw err;
    }
    console.log('Registros actualizados con valor_liquidado:', updatedRecords);

    // Guardar la liquidación en Historial_Liquidaciones
    const { data, error } = await supabase
      .from('Historial_Liquidaciones')
      .insert([
        {
          doctor,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          servicios, // Guardamos los servicios liquidados
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

    // Obtener el id_sede desde los parámetros de la solicitud
    const { id_sede } = req.query;
    console.log('id_sede recibido:', id_sede);

    if (!id_sede) {
      console.log('Error: id_sede no proporcionado');
      const err = new Error('El id_sede es requerido');
      err.statusCode = 400;
      throw err;
    }

    // Convertir id_sede a número entero
    const sedeId = parseInt(id_sede, 10);
    console.log('id_sede convertido a número:', sedeId);

    if (isNaN(sedeId)) {
      console.log('Error: id_sede no es un número válido');
      const err = new Error('El id_sede debe ser un número válido');
      err.statusCode = 400;
      throw err;
    }

    // Consultar liquidaciones filtradas por id_sede
    console.log('Consultando liquidaciones para id_sede:', sedeId);
    const { data, error } = await supabase
      .from('Historial_Liquidaciones')
      .select('*')
      .eq('id_sede', sedeId) // Filtrar por id_sede
      .order('fecha_liquidacion', { ascending: false });

    if (error) {
      console.error('Error al obtener el historial de liquidaciones:', error);
      const err = new Error('Error al obtener el historial de liquidaciones');
      err.statusCode = 500;
      throw err;
    }
    console.log(`Liquidaciones obtenidas: ${data.length} liquidaciones`, data);

    // Configurar cabeceras para evitar caché
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    });

    res.status(200).json(data);
    console.log('Respuesta enviada al cliente:', res.statusCode);
  } catch (err) {
    console.error('Error en getLiquidations:', err.message);
    console.error('Stack del error:', err.stack);
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