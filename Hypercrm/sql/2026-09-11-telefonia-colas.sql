-- Gestión de telefonía desde Hypercrm (extensiones/agentes + colas) — Fase 1
-- Correr contra la base `hyper`. Complementa sql/2026-09-07-llamadas-whatsapp.sql
-- (que ya crea crm_agente_extension).

-- Colas de Asterisk gestionadas desde Hypercrm. Los miembros son una lista
-- separada por comas de "extension" (referencian filas de
-- crm_agente_extension, pero se guardan como texto simple porque las colas
-- de Asterisk viven fuera de la FK relacional -- si se borra una extensión
-- que integra una cola, hay que sacarla a mano de members o desde la UI).
CREATE TABLE IF NOT EXISTS crm_colas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_nodo INT NOT NULL,
  nombre VARCHAR(32) NOT NULL,
  estrategia ENUM('ringall','leastrecent','fewestcalls','random','rrmemory','linear','wrandom') NOT NULL DEFAULT 'ringall',
  timeout_segundos INT NOT NULL DEFAULT 20,
  miembros TEXT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_nodo_nombre (id_nodo, nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
