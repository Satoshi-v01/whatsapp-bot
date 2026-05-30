-- Agrega precio_tarjeta a presentaciones
ALTER TABLE presentaciones ADD COLUMN IF NOT EXISTS precio_tarjeta INTEGER;
