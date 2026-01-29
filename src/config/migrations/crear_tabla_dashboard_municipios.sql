-- Crear tabla para gestionar municipios personalizados en dashboard
CREATE TABLE IF NOT EXISTS analista_municipios_dashboard (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_analista_id INT NOT NULL,
  municipio_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_analista_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (municipio_id) REFERENCES municipios(id) ON DELETE CASCADE,
  UNIQUE KEY unique_analista_municipio (usuario_analista_id, municipio_id)
);

-- Índices para optimizar consultas
CREATE INDEX idx_analista_dashboard ON analista_municipios_dashboard(usuario_analista_id);
CREATE INDEX idx_municipio_dashboard ON analista_municipios_dashboard(municipio_id);
