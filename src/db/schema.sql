-- categorias
CREATE TABLE caterogias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    disponible BOOLEAN DEFAULT true
);

-- productos
CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    categoria_id INTEGER REFERENCES categorias(id),
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
     calidad VARCHAR(30) DEFAULT 'standard',
    disponible BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- presentaciones
CREATE TABLE presentaciones (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER REFERENCES productos(id),
    nombre VARCHAR(100) NOT NULL,
    precio INTEGER NOT NULL,
    stock INTEGER DEFAULT 0,
    disponible BOOLEAN DEFAULT true
);

-- users
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    rol VARCHAR(20) DEFAULT 'agente',
    disponible BOOLEAN DEFAULT true
);

-- sesiones
CREATE TABLE sesiones (
    id SERIAL PRIMARY KEY,
    cliente_numero VARCHAR(20) UNIQUE NOT NULL,
    paso VARCHAR(50) DEFAULT 'inicio',
    modo VARCHAR(20) DEFAULT 'bot',
    datos JSONB DEFAULT '{}',
    agente_id INTEGER REFERENCES usuarios(id),
    ultimo_mensaje TIMESTAMP DEFAULT NOW()
);

-- ventas
CREATE TABLE ventas (
    id SERIAL PRIMARY KEY,
    cliente_numero VARCHAR(20) NOT NULL,
    presentacion_id INTEGER REFERENCES presentaciones(id),
    cantidad INTEGER DEFAULT 1,
    precio DECIMAL(10,2) NOT NULL,
    canal VARCHAR(20) DEFAULT 'whatsapp',
    estado VARCHAR(30) DEFAULT 'pendiente_pago',
    agente_id INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT NOW()
);