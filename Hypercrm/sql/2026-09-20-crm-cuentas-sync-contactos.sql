-- Constancia del pedido único de la agenda de la WhatsApp Business App
-- (coexistence) — Hypercrm. Correr contra la base `hyper`.
--
-- src/lib/whatsappSyncInicial.ts pide a Meta la sincronización inicial de
-- contactos (POST /{phone_number_id}/smb_app_data) una sola vez por alta, y
-- guarda acá el request_id y la hora para no repetirla. Si la columna no
-- existe, el código NO hace el pedido (no gasta la única oportunidad a ciegas).
--
-- Si se corre dos veces, la segunda falla con "Duplicate column name": es inocuo.
ALTER TABLE crm_cuentas
  ADD COLUMN sync_contactos_request_id VARCHAR(64) NULL,
  ADD COLUMN sync_contactos_at DATETIME NULL;
