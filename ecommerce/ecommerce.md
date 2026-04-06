# Ecommerce Sosa Bulls — Plan de desarrollo

## Stack
- **Frontend**: React + Vite + Tailwind CSS v3
- **Auth**: Supabase Auth (email/password + OAuth Google + Facebook)
- **DB**: Supabase (PostgreSQL) — misma instancia que el dashboard
- **Hosting**: a definir (Vercel recomendado)
- **URL prod**: https://sosabulls.com.py (a configurar)

---

## Modulos

### 1. Auth y cuentas de usuario
**Estado**: [ ] Pendiente

#### Tareas
- [ ] Activar providers en Supabase Dashboard (Google, Facebook)
- [ ] Crear credenciales OAuth en Google Cloud Console
- [ ] Crear credenciales OAuth en Facebook Developers
- [ ] Instalar `@supabase/supabase-js` en el ecommerce
- [ ] Crear cliente Supabase (`src/lib/supabase.js`)
- [ ] Pantalla Login / Registro (`src/pages/Login.jsx`)
  - [ ] Formulario email + password
  - [ ] Boton "Continuar con Google"
  - [ ] Boton "Continuar con Facebook"
  - [ ] Link "Crear cuenta"
- [ ] Pantalla Registro email (`src/pages/Register.jsx`)
- [ ] Callback OAuth (`src/pages/AuthCallback.jsx`)
- [ ] Context de sesion (`src/context/AuthContext.jsx`)
- [ ] Hook `useAuth` (`src/hooks/useAuth.js`)
- [ ] Rutas protegidas (`src/components/ProtectedRoute.jsx`)

---

### 2. Tablas nuevas en Supabase
**Estado**: [ ] Pendiente

#### SQL a ejecutar en Supabase

```sql
-- Perfil del cliente (extiende auth.users, relacion 1:1)
CREATE TABLE perfiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre                TEXT,
  telefono              TEXT,
  fecha_nacimiento      DATE,
  genero                TEXT,
  avatar_url            TEXT,
  marketing_email       BOOLEAN DEFAULT true,
  marketing_whatsapp    BOOLEAN DEFAULT false,
  cliente_id            INT REFERENCES clientes(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: cada usuario solo ve y edita su propio perfil
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perfil propio" ON perfiles
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Mascotas del usuario
CREATE TABLE mascotas (
  id                SERIAL PRIMARY KEY,
  perfil_id         UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  nombre            TEXT NOT NULL,
  especie           TEXT DEFAULT 'perro',
  raza              TEXT,
  fecha_nacimiento  DATE,
  peso_kg           NUMERIC(5,2),
  foto_url          TEXT,
  notas             TEXT,
  activo            BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mascotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mascotas propias" ON mascotas
  USING (perfil_id = auth.uid());

-- Direcciones de envio guardadas
CREATE TABLE direcciones_envio (
  id            SERIAL PRIMARY KEY,
  perfil_id     UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  alias         TEXT DEFAULT 'Casa',
  calle         TEXT NOT NULL,
  ciudad        TEXT NOT NULL,
  barrio        TEXT,
  referencia    TEXT,
  es_principal  BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE direcciones_envio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "direcciones propias" ON direcciones_envio
  USING (perfil_id = auth.uid());

-- Datos de facturacion (puede tener varios: el suyo, el de su papa, empresa, etc.)
-- El nombre/razon social y RUC pueden ser distintos al titular de la cuenta
CREATE TABLE datos_facturacion (
  id              SERIAL PRIMARY KEY,
  perfil_id       UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  alias           TEXT DEFAULT 'Principal',      -- ej: "Mi cuenta", "Papa", "Empresa"
  nombre          TEXT NOT NULL,                  -- nombre o razon social
  ruc             TEXT,                           -- RUC con digito verificador (ej: 1234567-8)
  telefono        TEXT,
  email           TEXT,
  es_principal    BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE datos_facturacion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "facturacion propia" ON datos_facturacion
  USING (perfil_id = auth.uid());

-- Trigger para crear perfil automaticamente al registrarse
CREATE OR REPLACE FUNCTION crear_perfil_nuevo_usuario()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO perfiles (id, nombre, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION crear_perfil_nuevo_usuario();
```

#### Tareas
- [ ] Ejecutar SQL de `perfiles` en Supabase
- [ ] Ejecutar SQL de `mascotas` en Supabase
- [ ] Ejecutar SQL de `direcciones_envio` en Supabase
- [ ] Ejecutar SQL de `datos_facturacion` en Supabase
- [ ] Crear trigger `on_auth_user_created`
- [ ] Verificar RLS activo en las 4 tablas

---

### 3. Mi Perfil (pagina del usuario logueado)
**Estado**: [ ] Pendiente

#### Tareas
- [ ] Pagina `src/pages/Perfil.jsx`
  - [ ] Ver y editar datos personales (nombre, telefono, fecha nac.)
  - [ ] Preferencias de marketing (checkbox email, whatsapp)
  - [ ] Cambiar password
  - [ ] Avatar (upload o URL de OAuth)
- [ ] Seccion "Mis mascotas"
  - [ ] Listar mascotas
  - [ ] Agregar mascota (nombre, raza, edad, peso, foto, notas)
  - [ ] Editar / eliminar mascota
- [ ] Seccion "Mis direcciones"
  - [ ] Listar direcciones guardadas
  - [ ] Agregar direccion (alias, calle, ciudad, barrio, referencia)
  - [ ] Marcar como principal
  - [ ] Eliminar direccion
- [ ] Seccion "Mis datos de facturacion"
  - [ ] Listar fichas de facturacion (alias, nombre/razon social, RUC)
  - [ ] Agregar ficha (alias, nombre, RUC, telefono, email)
  - [ ] Marcar como principal
  - [ ] Editar / eliminar ficha
  - [ ] Nota: el nombre y RUC pueden ser distintos al titular de la cuenta (ej: facturar a nombre del padre, empresa, etc.)
- [ ] Seccion "Mis pedidos" (historial de compras)
  - [ ] Listar pedidos con estado, fecha, total
  - [ ] Ver detalle de cada pedido

---

### 4. Vincular ecommerce con clientes del dashboard
**Estado**: [ ] Pendiente

Cuando el usuario realiza su primera compra o completa su perfil con telefono:
- Buscar en `clientes` por email o telefono
- Si existe: guardar `cliente_id` en `perfiles`
- Si no existe: crear registro en `clientes` con `origen = 'ecommerce'`

#### Tareas
- [ ] Endpoint backend `POST /ecommerce/vincular-cliente`
- [ ] Logica de vinculacion al completar primera compra
- [ ] En dashboard (Clientes), mostrar badge "tiene cuenta ecommerce"

---

### 5. Navbar — estado de sesion
**Estado**: [ ] Pendiente

El boton "Ingresar" del navbar debe cambiar segun el estado:
- [ ] Sin sesion: boton "Ingresar" → va a `/login`
- [ ] Con sesion: avatar/nombre + dropdown (Mi perfil, Mis pedidos, Cerrar sesion)

---

## Notas tecnicas

- La tabla `clientes` existe en el dashboard con: tipo, nombre, ruc, telefono, email, direccion, ciudad, notas, origen
- Al registrarse con OAuth (Google/Facebook), el trigger crea el perfil con nombre y avatar automaticamente
- `marketing_email` y `marketing_whatsapp` son los flags para campanas — siempre pedir consentimiento explicito
- Las mascotas permiten personalizar recomendaciones de productos y campanas (ej: "productos para tu perro [nombre]")
- Supabase RLS asegura que cada usuario solo acceda a sus propios datos sin necesidad de validacion extra en backend
- `datos_facturacion` es una lista de fichas por usuario — al hacer checkout se elige cual usar (o se crea una nueva). El nombre/RUC de la factura viene de ahi, no del perfil
- El campo `alias` en `datos_facturacion` es para que el usuario identifique cada ficha facilmente ("Mi cuenta", "Papa", "Empresa X")

---

## Progreso general

- [x] Estructura base del ecommerce (Navbar, Home, Category, Product, Cart, Search)
- [x] Carrito con Context
- [x] Buscador desktop y mobile
- [x] Drawer mobile
- [ ] Auth (login, registro, OAuth) — paso 1 (pendiente Supabase)
- [ ] Tablas en Supabase — paso 2 (pendiente)
- [x] AuthContext stub + useAuth + ProtectedRoute
- [x] Pagina Login (UI completa, Google/Facebook placeholder)
- [x] Pagina de perfil (datos personales, cambiar password, preferencias marketing)
- [x] Mascotas (CRUD completo, mock data)
- [x] Direcciones guardadas (CRUD completo, marcar principal, mock data)
- [x] Datos de facturacion (fichas nombre/RUC por ficha, CRUD, mock data)
- [x] Historial de pedidos (listado + detalle modal, mock data)
- [x] Navbar con estado de sesion (avatar+dropdown desktop, perfil en drawer mobile)
- [x] Vinculacion con dashboard — POST /api/ecommerce/vincular-cliente
- [x] Dashboard Clientes — badge "Ecommerce" para origen=ecommerce
