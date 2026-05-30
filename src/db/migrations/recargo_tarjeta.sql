-- Agrega recargo_tarjeta a la configuración de la tienda
INSERT INTO tienda_config (clave, valor)
VALUES ('recargo_tarjeta', '0')
ON CONFLICT (clave) DO NOTHING;
