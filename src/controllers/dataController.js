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

module.exports = {
  getDoctors,
  getAssistants,
  getServices,
  getPaymentMethods,
};