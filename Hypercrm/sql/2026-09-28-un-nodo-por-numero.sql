-- Un número (cuenta de crm_cuentas) pertenece a UN solo nodo — Hypercrm.
-- Correr contra la base `hyper`, DESPUÉS de deployar el código de la rama
-- un-nodo-por-numero (el código viejo recrea crm_cuentas_nodos al abrir la
-- pantalla de Números).
--
-- Antes: crm_cuentas_nodos vinculaba una cuenta con varias ciudades y el
-- webhook le preguntaba al cliente "¿sobre cuál ciudad?".
-- Ahora: el dueño es crm_cuentas.id_nodo (que ya existía y guardaba la ciudad
-- "principal", la de menor id). Un nodo puede tener varios números.

-- 1) Informe (solo lectura): cuentas que hoy atienden más de un nodo. Se
--    quedan con `queda_en`; las demás vinculaciones se descartan en el paso 4.
SELECT c.id, c.canal, c.identificador, c.id_nodo AS queda_en,
       GROUP_CONCAT(cn.id_nodo ORDER BY cn.id_nodo) AS nodos_hoy
FROM crm_cuentas c
JOIN crm_cuentas_nodos cn ON cn.id_cuenta = c.id
GROUP BY c.id, c.canal, c.identificador, c.id_nodo
HAVING COUNT(*) > 1;

-- 2) Las conversaciones que el selector de ciudad había mandado a otro nodo
--    vuelven al nodo del número (y sus mensajes con ellas). OJO: desde acá,
--    los operadores de esos otros nodos dejan de verlas en Soporte.
UPDATE whatsapp_conversations w
JOIN crm_cuentas c ON c.canal = 'whatsapp' AND c.identificador = w.phone_number_id
SET w.id_nodo = c.id_nodo
WHERE w.id_nodo <> c.id_nodo;

UPDATE whatsapp_messages m
JOIN whatsapp_conversations w ON w.id = m.conversation_id
SET m.id_nodo = w.id_nodo
WHERE m.id_nodo <> w.id_nodo;

-- 3) Conversaciones que quedaron esperando la respuesta del selector de ciudad.
UPDATE whatsapp_conversations
SET flow_state = NULL
WHERE flow_state LIKE '%seleccion_ciudad%';

-- 4) La tabla de vínculos N a N ya no se usa.
DROP TABLE IF EXISTS crm_cuentas_nodos;
