-- Contactos de la agenda de la WhatsApp Business App (coexistence) — Hypercrm
-- Correr contra la base `hyper`.

-- Alimentada por el webhook de Meta (field "smb_app_state_sync",
-- value.state_sync[]) vía src/lib/whatsappContactos.ts, llamado desde
-- src/app/hypercrm/api/whatsapp-webhooks/messages/route.ts
-- Una fila por (número de negocio, contacto). phone_number va en dígitos, el
-- mismo formato que whatsapp_conversations.phone_number.
CREATE TABLE IF NOT EXISTS whatsapp_contactos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone_number_id VARCHAR(64) NOT NULL,
  phone_number VARCHAR(32) NOT NULL,
  full_name VARCHAR(255) NULL,
  first_name VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_numero_contacto (phone_number_id, phone_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
