// File: src/controllers/dataController.js
const supabase = require('../config/supabase');

const getDoctors = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('Doctores')
      .select('nombre_doc')
      .order('nombre_doc', { ascending: true });

    if (error) {
      const err = new Error('Error al obtener los doctores');
      err.statusCode = 500;
      throw err;
    }

    res.status(200).json(data.map((doc) => doc.nombre_doc));
  } catch (err) {
    next(err);
  }
};

const getAssistants = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('Auxiliares')
      .select('nombre_aux')
      .order('nombre_aux', { ascending: true });

    if (error) {
      const err = new Error('Error al obtener los asistentes');
      err.statusCode = 500;
      throw err;
    }

    res.status(200).json(data.map((aux) => aux.nombre_aux));
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

    res.status(200).json(
      data.map((serv) => ({
        nombre: serv.nombre_serv,
        precio: serv.valor,
      }))
    );
  } catch (err) {
    next(err);
  }
};

const getPaymentMethods = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('Porcentaje_pagos')
      .select('id, porcentaje')
      .order('id', { ascending: true });

    if (error) {
      const err = new Error('Error al obtener los porcentajes de pagos');
      err.statusCode = 500;
      throw err;
    }

    res.status(200).json(data.map((method) => method.metodo_pago));
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