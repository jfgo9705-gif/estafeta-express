# ESTAFETA EXPRESS - Plataforma de Logística y Mensajería

Plataforma profesional de logística con sitio público, rastreo de envíos en tiempo real, panel administrador y base de datos persistente.

## Características

- **Sitio Público**: Landing page, rastreo de envíos, cotizador, servicios y contacto
- **Panel Administrador**: Crear, editar, eliminar y rastrear envíos
- **Autenticación**: Login seguro para administradores
- **Base de Datos**: SQLite con persistencia de datos
- **API REST**: Endpoints para todas las operaciones
- **Diseño Responsivo**: Optimizado para móvil y desktop
- **Etiqueta Profesional**: Diseño de etiqueta de envío estilo Estafeta

## Instalación

```bash
npm install
```

## Uso

```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`

## Estructura del Proyecto

```
estafeta-logistica/
├── index.html          # Página principal
├── admin.html          # Panel de administración
├── rastrear.html       # Página de rastreo
├── server.js           # Servidor Express
├── estafeta.db         # Base de datos SQLite
└── package.json        # Dependencias
```

## API Endpoints

### Autenticación
- `POST /api/login` - Iniciar sesión
- `POST /api/register` - Registrar nuevo administrador

### Envíos
- `GET /api/envios` - Obtener todos los envíos
- `GET /api/envios/:guia` - Obtener envío por guía
- `POST /api/envios` - Crear nuevo envío
- `PUT /api/envios/:guia` - Actualizar estado del envío
- `DELETE /api/envios/:guia` - Eliminar envío

## Administrador por Defecto

- Email: `sergio.ingeniero.esoterico@gmail.com`
- Contraseña: `Admin123!`

## Colores Corporativos

- Rojo: `#E30613`
- Blanco: `#FFFFFF`

## Licencia

ISC
