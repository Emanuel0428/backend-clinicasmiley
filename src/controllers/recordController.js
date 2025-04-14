const supabase = require('../config/supabase');

// /api/records
const createRecord = async (req, res, next) => {
  try {
    console.log('Iniciando creación de registro:', req.body);
    const {
      nombreDoctor,
      nombrePaciente,
      docId,
      servicios, // Ahora esperamos una lista de servicios
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
    } = req.body;

    // Si no se envía una lista de servicios, convertir el servicio único en una lista para compatibilidad
    const serviciosList = servicios || [
      {
        servicio: req.body.servicio,
        valor_total: req.body.valor_total,
        valor_liquidado: req.body.valor_liquidado,
      },
    ];

    // Validar y obtener los datos de cada servicio
    const serviciosData = [];
    let costoTotalServicios = 0;

    for (const serv of serviciosList) {
      console.log('Consultando servicio:', serv.servicio);
      const { data: servicioData, error: servicioError } = await supabase
        .from('Servicios')
        .select('valor, sesiones')
        .eq('nombre_serv', serv.servicio)
        .single();

      if (servicioError || !servicioData) {
        console.error('Error: Servicio no encontrado:', servicioError);
        const err = new Error(`Servicio no encontrado: ${serv.servicio}`);
        err.statusCode = 404;
        throw err;
      }
      console.log('Servicio encontrado:', servicioData);

      serviciosData.push({
        nombre_serv: serv.servicio,
        valor: servicioData.valor,
        sesiones: servicioData.sesiones,
      });
      costoTotalServicios += servicioData.valor;
    }
    console.log('Costo total de los servicios:', costoTotalServicios);

    // Verificar si el paciente existe en la tabla pacientes
    console.log('Verificando paciente con doc_id:', docId);
    let { data: pacienteData, error: pacienteError } = await supabase
      .from('pacientes')
      .select('paciente, doc_id, tot_abono')
      .eq('doc_id', docId)
      .single();

    if (pacienteError && pacienteError.code !== 'PGRST116') {
      console.error('Error al buscar paciente:', pacienteError);
      const err = new Error('Error al buscar el paciente');
      err.statusCode = 500;
      throw err;
    }

    // Si el paciente no existe, crearlo
    if (!pacienteData) {
      console.log('Paciente no encontrado, creando nuevo paciente');
      const { data: newPaciente, error: newPacienteError } = await supabase
        .from('pacientes')
        .insert({ doc_id: docId, paciente: nombrePaciente, tot_abono: 0 })
        .select()
        .single();

      if (newPacienteError) {
        console.error('Error al crear paciente:', newPacienteError);
        const err = new Error('Error al crear el paciente');
        err.statusCode = 500;
        throw err;
      }
      pacienteData = newPaciente;
      console.log('Paciente creado:', pacienteData);
    }

    // Obtener el método de pago principal
    let idMetodo = null;
    if (metodoPago) {
      console.log('Consultando método de pago:', metodoPago);
      const { data: metodoPagoData, error: metodoPagoError } = await supabase
        .from('Metodos_Pagos')
        .select('id_metodo')
        .eq('descpMetodo', metodoPago)
        .single();

      if (metodoPagoError || !metodoPagoData) {
        console.error('Error: Método de pago no encontrado:', metodoPagoError);
        const err = new Error('Método de pago no encontrado');
        err.statusCode = 404;
        throw err;
      }
      idMetodo = metodoPagoData.id_metodo;
      console.log('Método de pago encontrado:', idMetodo);
    }

    // Obtener el método de pago del abono
    let idMetodoAbono = null;
    if (metodoPagoAbono) {
      console.log('Consultando método de pago abono:', metodoPagoAbono);
      const { data: metodoPagoAbonoData, error: metodoPagoAbonoError } = await supabase
        .from('Metodos_Pagos')
        .select('id_metodo')
        .eq('descpMetodo', metodoPagoAbono)
        .single();

      if (metodoPagoAbonoError || !metodoPagoAbonoData) {
        console.error('Error: Método de pago del abono no encontrado:', metodoPagoAbonoError);
        const err = new Error('Método de pago del abono no encontrado');
        err.statusCode = 404;
        throw err;
      }
      idMetodoAbono = metodoPagoAbonoData.id_metodo;
      console.log('Método de pago abono encontrado:', idMetodoAbono);
    }

    // Determinar el porcentaje y el id_porc
    let idPorc;
    let porcentaje;
    if (esAuxiliar) {
      console.log('Consultando auxiliar:', nombreDoctor);
      const { data: auxiliarData, error: auxiliarError } = await supabase
        .from('Auxiliares')
        .select('id_porc')
        .eq('nombre_aux', nombreDoctor)
        .single();

      if (auxiliarError || !auxiliarData) {
        console.error('Error: Auxiliar no encontrado:', auxiliarError);
        const err = new Error('Auxiliar no encontrado');
        err.statusCode = 404;
        throw err;
      }
      idPorc = auxiliarData.id_porc;
      console.log('Auxiliar encontrado, id_porc:', idPorc);

      console.log('Consultando porcentaje para id_porc:', idPorc);
      const { data: porcData, error: porcError } = await supabase
        .from('Porcentaje_pagos')
        .select('porcentaje')
        .eq('id_porc', idPorc)
        .single();

      if (porcError || !porcData) {
        console.error('Error: Porcentaje no encontrado:', porcError);
        const err = new Error('Porcentaje no encontrado');
        err.statusCode = 404;
        throw err;
      }
      porcentaje = porcData.porcentaje / 100;
      console.log('Porcentaje encontrado:', porcentaje);
    } else {
      idPorc = esPacientePropio ? 2 : 1;
      porcentaje = esPacientePropio ? 0.5 : 0.4;
      console.log('No es auxiliar, id_porc asignado:', idPorc, 'Porcentaje:', porcentaje);
    }

    let finalIdCuenta = null;
    if (metodoPago === 'Transferencia' && id_cuenta) {
      finalIdCuenta = id_cuenta;
      console.log('Método de pago es Transferencia, id_cuenta:', finalIdCuenta);
    }

    let finalIdCuentaAbono = null;
    if (metodoPagoAbono === 'Transferencia' && id_cuenta_abono) {
      finalIdCuentaAbono = id_cuenta_abono;
      console.log('Método de pago abono es Transferencia, id_cuenta_abono:', finalIdCuentaAbono);
    }

    // Calcular el valor liquidado total considerando todos los servicios
    let valorLiquidadoTotal = costoTotalServicios;
    let totAbonoRestante = pacienteData.tot_abono || 0;
    let saldoAFavor = 0;

    // Aplicar el tot_abono del paciente al costo total
    if (totAbonoRestante > 0) {
      valorLiquidadoTotal -= totAbonoRestante;
      console.log('Aplicando tot_abono del paciente:', totAbonoRestante, 'Valor liquidado total:', valorLiquidadoTotal);
      if (valorLiquidadoTotal < 0) {
        totAbonoRestante = -valorLiquidadoTotal;
        valorLiquidadoTotal = 0;
        console.log('Tot_abono cubre más de lo necesario, tot_abono restante:', totAbonoRestante, 'Valor liquidado total ajustado a 0');
      } else {
        totAbonoRestante = 0;
        console.log('Tot_abono completamente utilizado, tot_abono restante:', totAbonoRestante);
      }
    }

    // Aplicar descuento (dividido proporcionalmente entre los servicios si hay más de uno)
    let descuentoTotal = descuento || 0;
    if (descuentoTotal > 0) {
      valorLiquidadoTotal -= descuentoTotal;
      console.log('Aplicando descuento total:', descuentoTotal, 'Valor liquidado total:', valorLiquidadoTotal);
    }

    // Aplicar abono (si aplica, también dividido proporcionalmente)
    let abonoTotal = abono || 0;
    if (abonoTotal > 0) {
      valorLiquidadoTotal -= abonoTotal;
      console.log('Aplicando abono total:', abonoTotal, 'Valor liquidado total:', valorLiquidadoTotal);
    }

    // Aplicar valor pagado
    if (valorPagado !== null && valorPagado > 0) {
      valorLiquidadoTotal -= valorPagado;
      console.log('Aplicando valor pagado:', valorPagado, 'Valor liquidado total:', valorLiquidadoTotal);
    }

    // Calcular saldo a favor si el valor liquidado total es menor a 0
    if (valorLiquidadoTotal < 0) {
      const valorNecesario = costoTotalServicios - (pacienteData.tot_abono || 0) - (descuentoTotal || 0) - (abonoTotal || 0);
      const pagoTotal = valorPagado || 0;
      saldoAFavor = pagoTotal - (valorNecesario > 0 ? valorNecesario : 0);
      console.log('Valor liquidado total es negativo:', valorLiquidadoTotal, 'Saldo a favor (tot_abono):', saldoAFavor);
      valorLiquidadoTotal = 0;
      console.log('Valor liquidado total ajustado a 0');
    } else if (valorLiquidadoTotal === 0) {
      console.log('Valor liquidado total es 0, no se genera saldo a favor adicional');
      saldoAFavor = 0;
    }

    // Distribuir el valor pagado, abono y descuento proporcionalmente entre los servicios
    const registros = [];
    let valorPagadoRestante = valorPagado || 0;
    let abonoRestante = abonoTotal;
    let descuentoRestante = descuentoTotal;
    let valorLiquidadoRestante = valorLiquidadoTotal;

    for (const servicioData of serviciosData) {
      const valorTotal = servicioData.valor;
      let valorLiquidado = valorTotal;
      let servicioAbono = 0;
      let servicioDescuento = 0;
      let servicioValorPagado = 0;

      // Distribuir el abono proporcionalmente
      if (abonoRestante > 0) {
        servicioAbono = Math.min(abonoRestante, valorLiquidado);
        abonoRestante -= servicioAbono;
        valorLiquidado -= servicioAbono;
      }

      // Distribuir el descuento proporcionalmente
      if (descuentoRestante > 0) {
        servicioDescuento = Math.min(descuentoRestante, valorLiquidado);
        descuentoRestante -= servicioDescuento;
        valorLiquidado -= servicioDescuento;
      }

      // Distribuir el valor pagado proporcionalmente
      if (valorPagadoRestante > 0) {
        servicioValorPagado = Math.min(valorPagadoRestante, valorLiquidado);
        valorPagadoRestante -= servicioValorPagado;
        valorLiquidado -= servicioValorPagado;
      }

      // Ajustar valor_liquidado para que no sea mayor que el valor total del servicio
      valorLiquidado = Math.max(0, valorLiquidado);

      // Determinar si es un servicio de 1 o 2 sesiones
      let fechaFinal = null;
      let existingRecord = null;

      if (servicioData.sesiones === 1) {
        fechaFinal = fecha;
        console.log('Servicio con 1 sesión, fecha final asignada:', fechaFinal);
      } else if (servicioData.sesiones === 2) {
        console.log('Servicio con 2 sesiones');
        console.log('Buscando registro previo para doc_id:', docId, 'servicio:', servicioData.nombre_serv);
        const { data: record, error: existingError } = await supabase
          .from('dia_dia')
          .select('*, pacientes!doc_id(paciente)')
          .eq('doc_id', docId)
          .eq('nombre_serv', servicioData.nombre_serv)
          .is('fecha_final', null)
          .single();

        if (existingError && existingError.code !== 'PGRST116') {
          console.error('Error al buscar registros previos:', existingError);
          const err = new Error('Error al buscar registros previos');
          err.statusCode = 500;
          throw err;
        }

        if (record) {
          existingRecord = record;
        } else {
          fechaFinal = null; // Primera sesión de 2
        }
      } else {
        fechaFinal = null; // Sesiones múltiples
      }

      const recordData = {
        doc_id: docId,
        nombre_serv: servicioData.nombre_serv,
        abono: servicioAbono > 0 ? servicioAbono : null,
        dcto: servicioDescuento > 0 ? servicioDescuento : null,
        valor_total: valorTotal,
        valor_liquidado: valorLiquidado,
        valor_pagado: servicioValorPagado,
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

      if (esAuxiliar) {
        recordData.nombre_aux = nombreDoctor;
        recordData.nombre_doc = null;
        console.log('Registro asignado como auxiliar:', nombreDoctor);
      } else {
        recordData.nombre_doc = nombreDoctor;
        recordData.nombre_aux = null;
        console.log('Registro asignado como doctor:', nombreDoctor);
      }

      if (existingRecord) {
        // Actualizar registro existente (segunda sesión de 2 sesiones)
        const updatedValorPagado = (existingRecord.valor_pagado || 0) + servicioValorPagado;
        const updatedAbono = (existingRecord.abono || 0) + servicioAbono;
        const updatedDcto = (existingRecord.dcto || 0) + servicioDescuento;
        const updatedEsDatáfono = metodoPago ? (metodoPago === 'Datáfono' ? !!esDatáfono : false) : existingRecord.es_datáfono;
        const updatedEsDatáfonoAbono = metodoPagoAbono ? (metodoPagoAbono === 'Datáfono' ? !!esDatáfonoAbono : false) : existingRecord.es_datáfono_abono;

        console.log('Actualizando registro existente con id:', existingRecord.id);
        const { data: updatedRecord, error: updateError } = await supabase
          .from('dia_dia')
          .update({
            fecha_final: fecha,
            valor_total: existingRecord.valor_total,
            valor_liquidado: valorLiquidado,
            valor_pagado: updatedValorPagado,
            abono: updatedAbono,
            dcto: updatedDcto,
            id_metodo: idMetodo || existingRecord.id_metodo,
            id_metodo_abono: idMetodoAbono || existingRecord.id_metodo_abono,
            id_cuenta: finalIdCuenta || existingRecord.id_cuenta,
            id_cuenta_abono: finalIdCuentaAbono || existingRecord.id_cuenta_abono,
            id_porc: idPorc,
            es_paciente_propio: esPacientePropio,
            monto_prestado: metodoPago === 'Crédito' ? montoPrestado : existingRecord.monto_prestado,
            titular_credito: metodoPago === 'Crédito' ? titularCredito : existingRecord.titular_credito,
            es_datáfono: updatedEsDatáfono,
            es_datáfono_abono: updatedEsDatáfonoAbono,
          })
          .eq('id', existingRecord.id)
          .select('*, pacientes!doc_id(paciente, tot_abono)')
          .single();

        if (updateError) {
          console.error('Error al actualizar el registro previo:', updateError);
          const err = new Error('Error al actualizar el registro previo');
          err.statusCode = 500;
          throw err;
        }
        console.log('Registro actualizado:', updatedRecord);

        registros.push({
          id: updatedRecord.id,
          nombreDoctor: updatedRecord.nombre_doc || updatedRecord.nombre_aux,
          nombrePaciente: updatedRecord.pacientes.paciente,
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
          tot_abono: updatedRecord.pacientes.tot_abono,
        });
      } else {
        // Crear nuevo registro
        console.log('Insertando nuevo registro en dia_dia');
        const { data, error } = await supabase
          .from('dia_dia')
          .insert([recordData])
          .select('*, pacientes!doc_id(paciente, tot_abono)')
          .single();

        if (error) {
          console.error('Error al crear el registro:', error);
          const err = new Error('Error al crear el registro');
          err.statusCode = 500;
          throw err;
        }
        console.log('Registro creado exitosamente:', data);

        registros.push({
          id: data.id,
          nombreDoctor: data.nombre_doc || data.nombre_aux,
          nombrePaciente: data.pacientes.paciente,
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
          tot_abono: data.pacientes.tot_abono,
        });
      }
    }

    // Actualizar tot_abono del paciente
    const nuevoTotAbono = totAbonoRestante + saldoAFavor;
    console.log('Actualizando tot_abono para paciente:', docId, 'Nuevo valor:', nuevoTotAbono);
    const { error: updatePacienteError } = await supabase
      .from('pacientes')
      .update({ tot_abono: nuevoTotAbono, paciente: nombrePaciente })
      .eq('doc_id', docId);

    if (updatePacienteError) {
      console.error('Error al actualizar tot_abono:', updatePacienteError);
      const err = new Error('Error al actualizar el total de abonos del paciente');
      err.statusCode = 500;
      throw err;
    }

    // Enviar respuesta con todos los registros creados/actualizados
    res.status(201).json(registros);
    console.log('Respuesta enviada, status: 201');
  } catch (err) {
    console.error('Error en createRecord:', err);
    next(err);
  }
};
const getRecords = async (req, res, next) => {
  try {
    console.log('Iniciando obtención de registros, query:', req.query);
    const { id_sede, filtrarEstado } = req.query;

    if (!id_sede) {
      console.error('Error: id_sede es requerido');
      const err = new Error('El id_sede es requerido');
      err.statusCode = 400;
      throw err;
    }

    const sedeId = parseInt(id_sede, 10);
    console.log('Sede ID:', sedeId);

    if (isNaN(sedeId)) {
      console.error('Error: id_sede no es un número válido');
      const err = new Error('El id_sede debe ser un número válido');
      err.statusCode = 400;
      throw err;
    }

    console.log('Consultando doctores para sede:', sedeId);
    const { data: doctores, error: doctoresError } = await supabase
      .from('Doctores')
      .select('nombre_doc')
      .eq('id_sede', sedeId);

    if (doctoresError) {
      console.error('Error al obtener doctores:', doctoresError);
      const err = new Error('Error al obtener los doctores');
      err.statusCode = 500;
      throw err;
    }
    console.log('Doctores encontrados:', doctores.length);

    const nombresDoctores = doctores.map(doctor => doctor.nombre_doc);
    console.log('Nombres de doctores:', nombresDoctores);

    console.log('Consultando auxiliares para sede:', sedeId);
    const { data: auxiliares, error: auxiliaresError } = await supabase
      .from('Auxiliares')
      .select('nombre_aux')
      .eq('id_sede', sedeId);

    if (auxiliaresError) {
      console.error('Error al obtener auxiliares:', auxiliaresError);
      const err = new Error('Error al obtener los auxiliares');
      err.statusCode = 500;
      throw err;
    }
    console.log('Auxiliares encontrados:', auxiliares.length);

    const nombresAuxiliares = auxiliares.map(auxiliar => auxiliar.nombre_aux);
    console.log('Nombres de auxiliares:', nombresAuxiliares);

    let doctorRecords = [];
    if (nombresDoctores.length > 0) {
      console.log('Obteniendo registros de doctores');
      let query = supabase
        .from('dia_dia')
        .select(`
          *,
          pacientes!doc_id(paciente, tot_abono),
          MetodoPagoPrincipal:Metodos_Pagos!dia_dia_id_metodo_fkey(descpMetodo),
          MetodoPagoAbono:Metodos_Pagos!dia_dia_id_metodo_abono_fkey(descpMetodo:descpMetodo),
          Servicio:Servicios!dia_dia_nombre_serv_fkey(sesiones)
        `)
        .not('nombre_doc', 'is', null)
        .in('nombre_doc', nombresDoctores)
        .order('fecha_inicio', { ascending: false });

      if (filtrarEstado === 'true') {
        query = query.or('estado.eq.false,estado.is.null');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error al obtener registros de doctores:', error);
        const err = new Error('Error al obtener los registros de doctores');
        err.statusCode = 500;
        throw err;
      }
      doctorRecords = data;
      console.log('Registros de doctores obtenidos:', doctorRecords.length);
    }

    let auxRecords = [];
    if (nombresAuxiliares.length > 0) {
      console.log('Obteniendo registros de auxiliares');
      let query = supabase
        .from('dia_dia')
        .select(`
          *,
          pacientes!doc_id(paciente, tot_abono),
          MetodoPagoPrincipal:Metodos_Pagos!dia_dia_id_metodo_fkey(descpMetodo),
          MetodoPagoAbono:Metodos_Pagos!dia_dia_id_metodo_abono_fkey(descpMetodo:descpMetodo),
          Servicio:Servicios!dia_dia_nombre_serv_fkey(sesiones)
        `)
        .not('nombre_aux', 'is', null)
        .in('nombre_aux', nombresAuxiliares)
        .order('fecha_inicio', { ascending: false });

      if (filtrarEstado === 'true') {
        query = query.or('estado.eq.false,estado.is.null');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error al obtener registros de auxiliares:', error);
        const err = new Error('Error al obtener los registros de auxiliares');
        err.statusCode = 500;
        throw err;
      }
      auxRecords = data;
      console.log('Registros de auxiliares obtenidos:', auxRecords.length);
    }

    const data = [...doctorRecords, ...auxRecords];
    console.log('Total de registros combinados:', data.length);

    const formattedData = data.map((record) => {
      const formatted = {
        id: record.id,
        nombreDoctor: record.nombre_doc || record.nombre_aux,
        nombrePaciente: record.pacientes ? record.pacientes.paciente : null,
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
        estado: record.estado ?? null,
        tot_abono: record.pacientes ? record.pacientes.tot_abono : 0,
      };
      return formatted;
    });
    console.log('Datos formateados, total:', formattedData.length);

    res.status(200).json(formattedData);
    console.log('Respuesta enviada, status: 200');
  } catch (err) {
    console.error('Error en getRecords:', err);
    next(err);
  }
};
const deleteRecords = async (req, res, next) => {
  try {
    console.log('Iniciando eliminación de registros:', req.body);
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      console.error('Error: Se requiere un array de IDs');
      const err = new Error('Se requiere un array de IDs para eliminar');
      err.statusCode = 400;
      throw err;
    }
    console.log('IDs a eliminar:', ids);

    console.log('Eliminando registros de dia_dia');
    const { error } = await supabase
      .from('dia_dia')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('Error al eliminar registros:', error);
      const err = new Error('Error al eliminar los registros');
      err.statusCode = 500;
      throw err;
    }
    console.log('Registros eliminados exitosamente');

    res.status(200).json({ message: 'Registros eliminados exitosamente' });
    console.log('Respuesta enviada, status: 200');
  } catch (err) {
    console.error('Error en deleteRecords:', err);
    next(err);
  }
};
const createLiquidation = async (req, res, next) => {
  try {
    console.log('Iniciando creación de liquidación:', req.body);
    const { doctor, fechaInicio, fechaFin, servicios, totalLiquidado, fechaLiquidacion } = req.body;

    if (!doctor || !fechaInicio || !fechaFin || !servicios || totalLiquidado === undefined || !fechaLiquidacion) {
      console.error('Error: Faltan datos requeridos');
      const err = new Error('Faltan datos requeridos para crear la liquidación');
      err.statusCode = 400;
      throw err;
    }

    let nombreDoc = null;
    let nombreAux = null;

    console.log('Verificando existencia de doctor:', doctor);
    const { data: doctorExists, error: doctorError } = await supabase
      .from('Doctores')
      .select('nombre_doc')
      .eq('nombre_doc', doctor)
      .single();

    if (doctorError && doctorError.code !== 'PGRST116') {
      console.error('Error al verificar doctor:', doctorError);
      const err = new Error('Error al verificar el doctor');
      err.statusCode = 500;
      throw err;
    }

    if (doctorExists) {
      nombreDoc = doctor;
      console.log('Doctor encontrado:', nombreDoc);
    } else {
      console.log('Doctor no encontrado, verificando auxiliar:', doctor);
      const { data: auxiliarExists, error: auxiliarError } = await supabase
        .from('Auxiliares')
        .select('nombre_aux')
        .eq('nombre_aux', doctor)
        .single();

      if (auxiliarError && auxiliarError.code !== 'PGRST116') {
        console.error('Error al verificar auxiliar:', auxiliarError);
        const err = new Error('Error al verificar el auxiliar');
        err.statusCode = 500;
        throw err;
      }

      if (auxiliarExists) {
        nombreAux = doctor;
        console.log('Auxiliar encontrado:', nombreAux);
      } else {
        console.error('Error: Nombre no registrado:', doctor);
        const err = new Error(`El nombre "${doctor}" no está registrado ni en la tabla Doctores ni en la tabla Auxiliares.`);
        err.statusCode = 400;
        throw err;
      }
    }

    const registrosAplanados = servicios.flat();
    const idsServicios = registrosAplanados.map(servicio => servicio.id);
    console.log('IDs de servicios para liquidar:', idsServicios);

    console.log('Consultando registros para liquidación');
    const { data: registros, error: registrosError } = await supabase
      .from('dia_dia')
      .select(`
        *,
        pacientes!doc_id(paciente),
        Porcentaje_pagos!id_porc(id_porc, porcentaje)
      `)
      .in('id', idsServicios);

    if (registrosError) {
      console.error('Error al consultar registros:', registrosError);
      const err = new Error('Error al consultar los registros para liquidar');
      err.statusCode = 500;
      throw err;
    }
    console.log('Registros encontrados:', registros.length);

    if (!registros || registros.length !== idsServicios.length) {
      console.error('Error: Algunos registros no fueron encontrados');
      const err = new Error('Algunos registros no fueron encontrados');
      err.statusCode = 404;
      throw err;
    }

    const sumaValorTotal = registros.reduce((sum, record) => sum + (record.valor_total || 0), 0);
    console.log('Suma total de valores:', sumaValorTotal);

    const liquidaciones = await Promise.all(
      registros.map(async (record) => {
        console.log('Procesando liquidación para registro:', record.id);
        if (!record.pacientes || !record.pacientes.paciente) {
          console.error('Error: Campo paciente es null en registro:', record.id);
          throw new Error('El campo paciente no puede ser null');
        }

        if (!record.Porcentaje_pagos || !record.Porcentaje_pagos.id_porc) {
          console.error('Error: Campo id_porc es null en registro:', record.id);
          throw new Error('El campo id_porc no puede ser null. Asegúrate de que todos los registros en dia_dia tengan un id_porc válido.');
        }

        let auxName = null;
        if (record.nombre_aux) {
          console.log('Verificando auxiliar en registro:', record.nombre_aux);
          const { data: auxExists, error: auxError } = await supabase
            .from('Auxiliares')
            .select('nombre_aux')
            .eq('nombre_aux', record.nombre_aux)
            .single();

          if (auxError && auxError.code !== 'PGRST116') {
            console.error('Error al verificar auxiliar:', auxError);
            throw new Error('Error al verificar el auxiliar');
          }

          if (auxExists) {
            auxName = record.nombre_aux;
            console.log('Auxiliar confirmado:', auxName);
          }
        }

        const valorPagadoLiquidado = sumaValorTotal > 0
          ? (record.valor_total / sumaValorTotal) * totalLiquidado
          : totalLiquidado / registros.length;
        console.log('Valor pagado liquidado para registro:', valorPagadoLiquidado);

        return {
          paciente: record.pacientes.paciente, // Usamos pacientes.paciente en lugar de record.paciente
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
    console.log('Liquidaciones preparadas:', liquidaciones.length);

    console.log('Insertando liquidaciones en Historial_Liquidacion');
    const { data: liquidacionesInsertadas, error: insertError } = await supabase
      .from('Historial_Liquidacion')
      .insert(liquidaciones)
      .select();

    if (insertError) {
      console.error('Error al guardar liquidaciones:', insertError);
      const err = new Error('Error al guardar las liquidaciones');
      err.statusCode = 500;
      throw err;
    }
    console.log('Liquidaciones insertadas:', liquidacionesInsertadas.length);

    console.log('Actualizando estado a true en dia_dia para IDs:', idsServicios);
    const { error: updateError } = await supabase
      .from('dia_dia')
      .update({ estado: true })
      .in('id', idsServicios);

    if (updateError) {
      console.error('Error al actualizar el estado en dia_dia:', updateError);
      const err = new Error('Error al actualizar el estado de los registros');
      err.statusCode = 500;
      throw err;
    }
    console.log('Estado actualizado exitosamente en dia_dia');

    res.status(201).json(liquidacionesInsertadas);
    console.log('Respuesta enviada, status: 201');
  } catch (err) {
    console.error('Error en createLiquidation:', err);
    next(err);
  }
};
const getLiquidations = async (req, res, next) => {
  try {
    console.log('Iniciando obtención de liquidaciones, query:', req.query);
    const { id_sede } = req.query;

    if (!id_sede) {
      console.error('Error: id_sede es requerido');
      const err = new Error('El id_sede es requerido');
      err.statusCode = 400;
      throw err;
    }

    const sedeId = parseInt(id_sede, 10);
    console.log('Sede ID:', sedeId);

    if (isNaN(sedeId)) {
      console.error('Error: id_sede no es un número válido');
      const err = new Error('El id_sede debe ser un número válido');
      err.statusCode = 400;
      throw err;
    }

    console.log('Consultando doctores para sede:', sedeId);
    const { data: doctores, error: doctoresError } = await supabase
      .from('Doctores')
      .select('nombre_doc')
      .eq('id_sede', sedeId);

    if (doctoresError) {
      console.error('Error al obtener doctores:', doctoresError);
      const err = new Error('Error al obtener los doctores');
      err.statusCode = 500;
      throw err;
    }
    console.log('Doctores encontrados:', doctores.length);

    const nombresDoctores = doctores.map(doctor => doctor.nombre_doc);
    console.log('Nombres de doctores:', nombresDoctores);

    console.log('Consultando auxiliares para sede:', sedeId);
    const { data: auxiliares, error: auxiliaresError } = await supabase
      .from('Auxiliares')
      .select('nombre_aux')
      .eq('id_sede', sedeId);

    if (auxiliaresError) {
      console.error('Error al obtener auxiliares:', auxiliaresError);
      const err = new Error('Error al obtener los auxiliares');
      err.statusCode = 500;
      throw err;
    }
    console.log('Auxiliares encontrados:', auxiliares.length);

    const nombresAuxiliares = auxiliares.map(auxiliar => auxiliar.nombre_aux);
    console.log('Nombres de auxiliares:', nombresAuxiliares);

    let doctorLiquidations = [];
    if (nombresDoctores.length > 0) {
      console.log('Obteniendo liquidaciones de doctores');
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
        console.error('Error al obtener liquidaciones de doctores:', error);
        const err = new Error('Error al obtener las liquidaciones de doctores');
        err.statusCode = 500;
        throw err;
      }
      doctorLiquidations = data;
      console.log('Liquidaciones de doctores obtenidas:', doctorLiquidations.length);
    }

    let auxLiquidations = [];
    if (nombresAuxiliares.length > 0) {
      console.log('Obteniendo liquidaciones de auxiliares');
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
        console.error('Error al obtener liquidaciones de auxiliares:', error);
        const err = new Error('Error al obtener las liquidaciones de auxiliares');
        err.statusCode = 500;
        throw err;
      }
      auxLiquidations = data;
      console.log('Liquidaciones de auxiliares obtenidas:', auxLiquidations.length);
    }

    const rawLiquidations = [...doctorLiquidations, ...auxLiquidations];
    console.log('Total de liquidaciones combinadas:', rawLiquidations.length);

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
    console.log('Liquidaciones agrupadas:', Object.keys(groupedLiquidations).length);

    const liquidations = Object.keys(groupedLiquidations).map((key, index) => ({
      id: `group_${index}`,
      ...groupedLiquidations[key],
    }));
    console.log('Liquidaciones formateadas:', liquidations.length);

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    });
    console.log('Encabezados de caché configurados');

    res.status(200).json(liquidations);
    console.log('Respuesta enviada, status: 200');
  } catch (err) {
    console.error('Error en getLiquidations:', err);
    next(err);
  }
};

const deleteLiquidations = async (req, res, next) => {
  try {
    console.log('Iniciando eliminación de liquidaciones:', req.body);
    const { groups } = req.body;

    if (!groups || !Array.isArray(groups) || groups.length === 0) {
      console.error('Error: Se requiere un array de grupos');
      const err = new Error('Se requiere un array de grupos para eliminar');
      err.statusCode = 400;
      throw err;
    }
    console.log('Grupos a eliminar:', groups.length);

    for (const group of groups) {
      const { doctor, fecha_inicio, fecha_final, fecha_liquidacion } = group;
      console.log('Procesando grupo:', { doctor, fecha_inicio, fecha_final, fecha_liquidacion });

      if (!doctor || !fecha_inicio || !fecha_final || !fecha_liquidacion) {
        console.error('Error: Faltan datos en grupo');
        const err = new Error('Faltan datos requeridos en uno de los grupos');
        err.statusCode = 400;
        throw err;
      }

      console.log('Verificando si es doctor:', doctor);
      const { data: doctorExists } = await supabase
        .from('Doctores')
        .select('nombre_doc')
        .eq('nombre_doc', doctor)
        .single();

      const isDoctor = !!doctorExists;
      console.log('Es doctor:', isDoctor);

      console.log('Eliminando liquidaciones para:', isDoctor ? 'doctor' : 'auxiliar', doctor);
      const { error } = await supabase
        .from('Historial_Liquidacion')
        .delete()
        .eq(isDoctor ? 'nombre_doc' : 'nombre_aux', doctor)
        .eq('fecha_inicio', fecha_inicio)
        .eq('fecha_final', fecha_final)
        .eq('fecha_liquidacion', fecha_liquidacion);

      if (error) {
        console.error('Error al eliminar liquidaciones:', error);
        const err = new Error('Error al eliminar las liquidaciones');
        err.statusCode = 500;
        throw err;
      }
      console.log('Liquidaciones eliminadas para grupo');
    }

    res.status(200).json({ message: 'Liquidaciones eliminadas exitosamente' });
    console.log('Respuesta enviada, status: 200');
  } catch (err) {
    console.error('Error en deleteLiquidations:', err);
    next(err);
  }
};
const searchPatients = async (req, res, next) => {
  try {
    console.log('Iniciando búsqueda de pacientes, query:', req.query);
    const { nombre } = req.query;

    if (!nombre) {
      console.error('Error: nombre es requerido');
      const err = new Error('El nombre es requerido');
      err.statusCode = 400;
      throw err;
    }

    console.log('Buscando pacientes con nombre similar a:', nombre);
    const { data: pacientes, error } = await supabase
      .from('pacientes')
      .select('paciente, doc_id, tot_abono')
      .ilike('paciente', `%${nombre}%`);

    if (error) {
      console.error('Error al buscar pacientes:', error);
      const err = new Error('Error al buscar pacientes');
      err.statusCode = 500;
      throw err;
    }
    console.log('Pacientes encontrados:', pacientes.length);

    res.status(200).json(pacientes);
    console.log('Respuesta enviada, status: 200');
  } catch (err) {
    console.error('Error en searchPatients:', err);
    next(err);
  }
};

module.exports = {
  createRecord,
  getRecords,
  deleteRecords,
  createLiquidation,
  getLiquidations,
  searchPatients, 
  deleteLiquidations,
};