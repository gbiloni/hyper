-- Constancia del pedido único del historial de chats de la WhatsApp Business
-- App (coexistence) — Hypercrm. Correr contra la base `hyper`.
--
-- src/lib/whatsappSyncInicial.ts pide a Meta el historial (POST
-- /{phone_number_id}/smb_app_data, sync_type "history") una sola vez por alta
-- y guarda acá el request_id y la hora para no repetirlo. Si la columna no
-- existe, el código NO hace el pedido (no gasta la única oportunidad a ciegas).
-- Es independiente de 2026-09-20 (contactos): cada pedido tiene su constancia.
--
-- Si se corre dos veces, la segunda falla con "Duplicate column name": es inocuo.
ALTER TABLE crm_cuentas
  ADD COLUMN sync_historial_request_id VARCHAR(64) NULL,
  ADD COLUMN sync_historial_at DATETIME NULL;
