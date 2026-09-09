-- Llamadas por WhatsApp (Calling API vía SIP) — Fase 1 (solo Hypercrm)
-- Correr contra la base `hyper`.

-- Log de llamadas: alimentado por el webhook de Meta (field "calls",
-- eventos call_created/terminate) en
-- src/app/hypercrm/api/whatsapp-webhooks/messages/route.ts
CREATE TABLE IF NOT EXISTS crm_llamadas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_nodo INT NOT NULL,
  conversation_id INT NULL,
  wa_call_id VARCHAR(128) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  direction ENUM('INBOUND','OUTBOUND') NOT NULL,
  status VARCHAR(30) NULL,
  id_usuario_atendio INT NULL,
  start_time DATETIME NULL,
  end_time DATETIME NULL,
  duration_seconds INT NULL,
  raw_created_payload JSON NULL,
  raw_terminate_payload JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_wa_call_id (wa_call_id),
  KEY idx_nodo_created (id_nodo, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mapeo agente (usuario) -> interno SIP del softphone embebido.
-- ws_uri / sip_domain quedan con placeholder hasta tener el Asterisk/Issabel
-- nuevo arriba; no rompen nada mientras tanto (la llamada simplemente no va
-- a poder registrarse hasta configurarlos con valores reales).
CREATE TABLE IF NOT EXISTS crm_agente_extension (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  id_nodo INT NOT NULL,
  extension VARCHAR(20) NOT NULL,
  secret VARCHAR(255) NOT NULL,
  ws_uri VARCHAR(255) NOT NULL DEFAULT '',
  sip_domain VARCHAR(255) NOT NULL DEFAULT '',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuario_nodo (id_usuario, id_nodo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
