const supabase = require('../config/supabase');

const getIdSedeFromRequest = (req) => {
  const id_sede = req.query.id_sede;
  if (!id_sede) {
    const err = new Error('id_sede is required');
    err.statusCode = 400;
    throw err;
  }
  return parseInt(id_sede, 10);
};

const getDoctors = async (req, res, next) => {
  try {
    const id_sede = getIdSedeFromRequest(req);

    const { data, error } = await supabase
      .from('Doctores')
      .select('nombre_doc')
      .eq('id_sede', id_sede)
      .order('nombre_doc', { ascending: true });

    if (error) {
      const err = new Error('Error al obtener los doctores');
      err.statusCode = 500;
      throw err;
    }

    const formattedData = data.map((doc) => doc.nombre_doc);

    res.status(200).json(formattedData);
  } catch (err) {
    next(err);
  }
};

const getAssistants = async (req, res, next) => {
  try {
    const id_sede = getIdSedeFromRequest(req);

    const { data, error } = await supabase
      .from('Auxiliares')
      .select('nombre_aux')
      .eq('id_sede', id_sede)
      .order('nombre_aux', { ascending: true });

    if (error) {
      const err = new Error('Error al obtener los asistentes');
      err.statusCode = 500;
      throw err;
    }

    const formattedData = data.map((aux) => aux.nombre_aux);

    res.status(200).json(formattedData);
  } catch (err) {
    next(err);
  }
};

const getServices = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('Servicios')
      .select('nombre_serv, valor, descripcion_servicios')
      .order('nombre_serv', { ascending: true });

    if (error) {
      const err = new Error('Error al obtener los servicios');
      err.statusCode = 500;
      throw err;
    }

    const formattedData = data.map((serv) => ({
      nombre: serv.nombre_serv,
      precio: serv.valor,
    }));

    res.status(200).json(formattedData);
  } catch (err) {
    next(err);
  }
};

const addService = async (req, res, next) => {
  try {
    const { nombre, precio } = req.body;

    if (!nombre || precio <= 0) {
      const err = new Error('Nombre y precio válidos son requeridos');
      err.statusCode = 400;
      throw err;
    }

    const { data: existing, error: checkError } = await supabase
      .from('Servicios')
      .select('nombre_serv')
      .eq('nombre_serv', nombre);

    if (checkError) {
      const err = new Error('Error al verificar el servicio');
      err.statusCode = 500;
      throw err;
    }

    if (existing.length > 0) {
      const err = new Error('Ya existe un servicio con este nombre');
      err.statusCode = 400;
      throw err;
    }

    const { data, error } = await supabase
      .from('Servicios')
      .insert([{ nombre_serv: nombre, valor: precio }])
      .select('nombre_serv, valor');

    if (error) {
      const err = new Error('Error al añadir el servicio');
      err.statusCode = 500;
      throw err;
    }

    const newService = {
      nombre: data[0].nombre_serv,
      precio: data[0].valor,
    };

    res.status(201).json(newService);
  } catch (err) {
    next(err);
  }
};

const updateService = async (req, res, next) => {
  try {
    const { nombreOriginal, nombre, precio } = req.body;

    if (!nombreOriginal || !nombre || precio <= 0) {
      const err = new Error('Nombre original, nombre nuevo y precio válido son requeridos');
      err.statusCode = 400;
      throw err;
    }

    const { data: existing, error: checkError } = await supabase
      .from('Servicios')
      .select('nombre_serv')
      .eq('nombre_serv', nombre)
      .neq('nombre_serv', nombreOriginal);

    if (checkError) {
      const err = new Error('Error al verificar el servicio');
      err.statusCode = 500;
      throw err;
    }

    if (existing.length > 0) {
      const err = new Error('Ya existe otro servicio con este nombre');
      err.statusCode = 400;
      throw err;
    }

    const { data, error } = await supabase
      .from('Servicios')
      .update({ nombre_serv: nombre, valor: precio })
      .eq('nombre_serv', nombreOriginal)
      .select('nombre_serv, valor');

    if (error) {
      const err = new Error('Error al actualizar el servicio');
      err.statusCode = 500;
      throw err;
    }

    if (data.length === 0) {
      const err = new Error('Servicio no encontrado');
      err.statusCode = 404;
      throw err;
    }

    const updatedService = {
      nombre: data[0].nombre_serv,
      precio: data[0].valor,
    };

    res.status(200).json(updatedService);
  } catch (err) {
    next(err);
  }
};

const deleteService = async (req, res, next) => {
  try {
    const { nombre } = req.body;

    if (!nombre) {
      const err = new Error('Nombre del servicio requerido');
      err.statusCode = 400;
      throw err;
    }

    const { data, error } = await supabase
      .from('Servicios')
      .delete()
      .eq('nombre_serv', nombre)
      .select('nombre_serv, valor');

    if (error) {
      const err = new Error('Error al eliminar el servicio');
      err.statusCode = 500;
      throw err;
    }

    if (data.length === 0) {
      const err = new Error('Servicio no encontrado');
      err.statusCode = 404;
      throw err;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

const getPaymentMethods = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('Metodos_Pagos')
      .select('descpMetodo')
      .order('descpMetodo', { ascending: true });

    if (error) {
      const err = new Error('Error al obtener los métodos de pago');
      err.statusCode = 500;
      throw err;
    }

    const formattedData = data.map((method) => method.descpMetodo);

    res.status(200).json(formattedData);
  } catch (err) {
    next(err);
  }
};

const getAccounts = async (req, res, next) => {
  try {
    const id_sede = getIdSedeFromRequest(req);

    const { data, error } = await supabase
      .from('Cuentas')
      .select('id_cuenta, cuentas')
      .eq('id_sede', id_sede)
      .order('cuentas', { ascending: true });

    if (error) {
      const err = new Error('Error al obtener las cuentas bancarias');
      err.statusCode = 500;
      throw err;
    }

    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDoctors,
  getAssistants,
  getServices,
  addService,     
  updateService,  
  deleteService,   
  getPaymentMethods,
  getAccounts,
};