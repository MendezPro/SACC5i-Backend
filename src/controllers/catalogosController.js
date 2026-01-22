import pool from '../config/database.js';

// Obtener tipos de oficio
export const getTiposOficio = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const [tipos] = await connection.query(
      'SELECT * FROM tipos_oficio ORDER BY nombre ASC'
    );

    res.json({
      success: true,
      data: tipos
    });

  } catch (error) {
    console.error('Error al obtener tipos de oficio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tipos de oficio',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Obtener municipios
export const getMunicipios = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { region_id } = req.query;
    
    let query = 'SELECT m.*, r.nombre as region_nombre FROM municipios m LEFT JOIN regiones r ON m.region_id = r.id';
    const params = [];

    if (region_id) {
      query += ' WHERE m.region_id = ?';
      params.push(region_id);
    }

    query += ' ORDER BY m.nombre ASC';

    const [municipios] = await connection.query(query, params);

    res.json({
      success: true,
      data: municipios
    });

  } catch (error) {
    console.error('Error al obtener municipios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener municipios',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Obtener regiones
export const getRegiones = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const [regiones] = await connection.query(
      'SELECT * FROM regiones ORDER BY nombre ASC'
    );

    res.json({
      success: true,
      data: regiones
    });

  } catch (error) {
    console.error('Error al obtener regiones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener regiones',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Obtener estatus de solicitudes
export const getEstatus = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const [estatus] = await connection.query(
      'SELECT * FROM estatus_solicitudes ORDER BY id ASC'
    );

    res.json({
      success: true,
      data: estatus
    });

  } catch (error) {
    console.error('Error al obtener estatus:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estatus',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Obtener dependencias (28 del C5i)
export const getDependencias = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const [dependencias] = await connection.query(
      'SELECT * FROM dependencias ORDER BY nombre ASC'
    );

    res.json({
      success: true,
      data: dependencias,
      total: dependencias.length
    });

  } catch (error) {
    console.error('Error al obtener dependencias:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener dependencias',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Obtener puestos con filtro de competencia
export const getPuestos = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const [puestos] = await connection.query(
      'SELECT * FROM puestos ORDER BY nombre ASC'
    );

    res.json({
      success: true,
      data: puestos,
      total: puestos.length,
      message: 'Puestos con es_competencia_municipal=FALSE serán rechazados automáticamente'
    });

  } catch (error) {
    console.error('Error al obtener puestos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener puestos',
      error: error.message
    });
  } finally {
    connection.release();
  }
};
