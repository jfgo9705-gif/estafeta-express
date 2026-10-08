const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const { PDFDocument, rgb } = require('pdfkit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MEXICO_TIME_ZONE = 'America/Mexico_City';

function mexicoDateKey(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: MEXICO_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date).reduce((result, part) => {
        if (part.type !== 'literal') result[part.type] = part.value;
        return result;
    }, {});
    return `${parts.year}${parts.month}${parts.day}`;
}

function mexicoDateTime(date = new Date()) {
    return new Intl.DateTimeFormat('es-MX', {
        timeZone: MEXICO_TIME_ZONE,
        dateStyle: 'short',
        timeStyle: 'medium'
    }).format(date);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Base de datos SQLite
let db;
try {
    db = new Database('./estafeta.db');
    console.log('Conectado a SQLite');
    inicializarBD();
} catch (err) {
    console.error('Error al conectar a la base de datos:', err);
    process.exit(1);
}

// Inicializar base de datos
function inicializarBD() {
    try {
        // Tabla de administradores
        db.exec(`
            CREATE TABLE IF NOT EXISTS administradores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                nombre TEXT,
                fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de envíos
        db.exec(`
            CREATE TABLE IF NOT EXISTS envios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                numero_guia TEXT UNIQUE NOT NULL,
                remitente TEXT NOT NULL,
                destinatario TEXT NOT NULL,
                telefono_remitente TEXT,
                telefono_destinatario TEXT,
                direccion TEXT,
                ciudad_origen TEXT NOT NULL,
                ciudad_destino TEXT NOT NULL,
                estado TEXT DEFAULT 'Guía creada',
                peso REAL,
                volumen INTEGER,
                observaciones TEXT,
                fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_entrega_estimada DATE,
                historial TEXT
            )
        `);
        
        // Crear índices para mejor rendimiento
        db.exec(`CREATE INDEX IF NOT EXISTS idx_numero_guia ON envios(numero_guia)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_email ON administradores(email)`);

        // Verificar si existe el administrador por defecto
        const checkAdmin = db.prepare("SELECT * FROM administradores WHERE email = ?");
        const admin = checkAdmin.get('sergio.ingeniero.esoterico@gmail.com');

        if (!admin) {
            const insertAdmin = db.prepare(
                "INSERT INTO administradores (email, password, nombre) VALUES (?, ?, ?)"
            );
            insertAdmin.run('sergio.ingeniero.esoterico@gmail.com', 'Admin123!', 'Sergio');
            console.log('Administrador por defecto creado');
        }

        // Insertar datos de prueba solo si no existen
        const countEnvios = db.prepare("SELECT COUNT(*) as count FROM envios").get();
        
        if (countEnvios && countEnvios.count === 0) {
            const datosEjemplo = [
                {
                    numero_guia: "EST-20260501-00001",
                    remitente: "Carlos López",
                    destinatario: "María García",
                    telefono_remitente: "+52 5555551234",
                    telefono_destinatario: "+52 3331234567",
                    direccion: "Calle Principal 123",
                    ciudad_origen: "Ciudad de México",
                    ciudad_destino: "Guadalajara",
                    estado: "En tránsito",
                    peso: 2.5,
                    volumen: 1500,
                    observaciones: "Frágil",
                    fecha_entrega_estimada: "2026-05-03",
                    historial: JSON.stringify([
                        { fecha: "2026-05-01 08:00", estado: "Guía creada", descripcion: "Envío registrado" },
                        { fecha: "2026-05-01 14:30", estado: "En recolección", descripcion: "Paquete recolectado" },
                        { fecha: "2026-05-02 06:00", estado: "En tránsito", descripcion: "En ruta" }
                    ])
                },
                {
                    numero_guia: "EST-20260501-00002",
                    remitente: "Juan Martínez",
                    destinatario: "Roberto Sánchez",
                    telefono_remitente: "+52 8144445678",
                    telefono_destinatario: "+52 9988776655",
                    direccion: "Avenida Secundaria 456",
                    ciudad_origen: "Monterrey",
                    ciudad_destino: "Cancún",
                    estado: "En centro logístico",
                    peso: 1.2,
                    volumen: 800,
                    observaciones: "Urgente",
                    fecha_entrega_estimada: "2026-05-04",
                    historial: JSON.stringify([
                        { fecha: "2026-05-01 09:00", estado: "Guía creada", descripcion: "Envío registrado" },
                        { fecha: "2026-05-01 15:00", estado: "En recolección", descripcion: "Paquete recolectado" },
                        { fecha: "2026-05-02 08:00", estado: "En centro logístico", descripcion: "En centro" }
                    ])
                },
                {
                    numero_guia: "EST-20260501-00003",
                    remitente: "Ana Rodríguez",
                    destinatario: "Pedro Gómez",
                    telefono_remitente: "+52 2291234567",
                    telefono_destinatario: "+52 5559876543",
                    direccion: "Calle Tercera 789",
                    ciudad_origen: "Veracruz",
                    ciudad_destino: "Ciudad de México",
                    estado: "En ruta de entrega",
                    peso: 3.0,
                    volumen: 2000,
                    observaciones: "Mantener fresco",
                    fecha_entrega_estimada: "2026-05-02",
                    historial: JSON.stringify([
                        { fecha: "2026-04-30 10:00", estado: "Guía creada", descripcion: "Envío registrado" },
                        { fecha: "2026-04-30 16:00", estado: "En recolección", descripcion: "Paquete recolectado" },
                        { fecha: "2026-05-01 07:00", estado: "En tránsito", descripcion: "En ruta" },
                        { fecha: "2026-05-02 08:00", estado: "En centro logístico", descripcion: "En centro" },
                        { fecha: "2026-05-02 14:00", estado: "En ruta de entrega", descripcion: "Con repartidor" }
                    ])
                },
                {
                    numero_guia: "EST-20260501-00004",
                    remitente: "Luis Fernández",
                    destinatario: "Sofía Morales",
                    telefono_remitente: "+52 3331111111",
                    telefono_destinatario: "+52 8144442222",
                    direccion: "Boulevard Principal 321",
                    ciudad_origen: "Guadalajara",
                    ciudad_destino: "Monterrey",
                    estado: "Entregado",
                    peso: 1.8,
                    volumen: 1200,
                    observaciones: "Entregado correctamente",
                    fecha_entrega_estimada: "2026-05-01",
                    historial: JSON.stringify([
                        { fecha: "2026-04-28 11:00", estado: "Guía creada", descripcion: "Envío registrado" },
                        { fecha: "2026-04-28 17:00", estado: "En recolección", descripcion: "Paquete recolectado" },
                        { fecha: "2026-04-29 08:00", estado: "En tránsito", descripcion: "En ruta" },
                        { fecha: "2026-04-30 09:00", estado: "En centro logístico", descripcion: "En centro" },
                        { fecha: "2026-05-01 10:00", estado: "En ruta de entrega", descripcion: "Con repartidor" },
                        { fecha: "2026-05-01 16:30", estado: "Entregado", descripcion: "Entregado al destinatario" }
                    ])
                },
                {
                    numero_guia: "EST-20260501-00005",
                    remitente: "Miguel Ángel Torres",
                    destinatario: "Gabriela López",
                    telefono_remitente: "+52 9988883333",
                    telefono_destinatario: "+52 2295554444",
                    direccion: "Calle Cuarta 654",
                    ciudad_origen: "Cancún",
                    ciudad_destino: "Veracruz",
                    estado: "Guía creada",
                    peso: 2.2,
                    volumen: 1400,
                    observaciones: "Nuevo envío",
                    fecha_entrega_estimada: "2026-05-12",
                    historial: JSON.stringify([
                        { fecha: "2026-05-08 09:00", estado: "Guía creada", descripcion: "Envío registrado" }
                    ])
                }
            ];

            const insertEnvio = db.prepare(`
                INSERT INTO envios (numero_guia, remitente, destinatario, telefono_remitente, 
                 telefono_destinatario, direccion, ciudad_origen, ciudad_destino, estado, 
                 peso, volumen, observaciones, fecha_entrega_estimada, historial) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            datosEjemplo.forEach(envio => {
                insertEnvio.run(
                    envio.numero_guia, envio.remitente, envio.destinatario, envio.telefono_remitente,
                    envio.telefono_destinatario, envio.direccion, envio.ciudad_origen, envio.ciudad_destino,
                    envio.estado, envio.peso, envio.volumen, envio.observaciones, 
                    envio.fecha_entrega_estimada, envio.historial
                );
            });

            console.log('Datos de prueba insertados');
        }
    } catch (err) {
        console.error('Error al inicializar BD:', err);
    }
}

// ============ RUTAS DE AUTENTICACIÓN ============

// Login
app.post('/api/login', (req, res) => {
    try {
        const { email, password } = req.body;

        const stmt = db.prepare("SELECT * FROM administradores WHERE email = ? AND password = ?");
        const row = stmt.get(email, password);

        if (row) {
            res.json({ success: true, admin: { email: row.email, nombre: row.nombre } });
        } else {
            res.status(401).json({ success: false, error: 'Credenciales inválidas' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Registro
app.post('/api/register', (req, res) => {
    try {
        const { email, password, nombre } = req.body;

        const stmt = db.prepare("INSERT INTO administradores (email, password, nombre) VALUES (?, ?, ?)");
        stmt.run(email, password, nombre);

        res.json({ success: true, message: 'Cuenta creada exitosamente' });
    } catch (err) {
        res.status(400).json({ error: 'El correo ya está registrado' });
    }
});

// ============ RUTAS DE ENVÍOS ============

// Obtener todos los envíos
app.get('/api/envios', (req, res) => {
    try {
        const stmt = db.prepare("SELECT * FROM envios");
        const rows = stmt.all();
        res.json({ envios: rows });
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener envíos' });
    }
});

// Obtener envío por guía (endpoint alternativo)
app.get('/api/envio/:guia', (req, res) => {
    try {
        const { guia } = req.params;

        const stmt = db.prepare("SELECT * FROM envios WHERE numero_guia = ?");
        const row = stmt.get(guia);

        if (row) {
            row.historial = JSON.parse(row.historial || '[]');
            res.json({ success: true, envio: row });
        } else {
            res.status(404).json({ success: false, error: 'Envío no encontrado' });
        }
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ success: false, error: 'Error al obtener envío' });
    }
});

// Obtener envío por guía
app.get('/api/envios/:guia', (req, res) => {
    try {
        const { guia } = req.params;

        const stmt = db.prepare("SELECT * FROM envios WHERE numero_guia = ?");
        const row = stmt.get(guia);

        if (row) {
            row.historial = JSON.parse(row.historial || '[]');
            res.json(row);
        } else {
            res.status(404).json({ error: 'Envío no encontrado' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener envío' });
    }
});

// Crear envío
app.post('/api/crear-envio', (req, res) => {
    try {
        const {
            remitente, destinatario, telefono_remitente, telefono_destinatario,
            direccion, ciudad_origen, ciudad_destino, peso, volumen, observaciones
        } = req.body;

        // Generar número de guía
        const fecha = mexicoDateKey();
        const countStmt = db.prepare("SELECT COUNT(*) as count FROM envios");
        const countRow = countStmt.get();
        const numero = String((countRow?.count || 0) + 1).padStart(5, '0');
        const numero_guia = `EST-${fecha}-${numero}`;

        const fecha_entrega = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0];

        const historial = JSON.stringify([
            {
                fecha: mexicoDateTime(),
                estado: "Guía creada",
                descripcion: "Envío registrado en el sistema"
            }
        ]);

        const insertStmt = db.prepare(`
            INSERT INTO envios (numero_guia, remitente, destinatario, telefono_remitente, 
             telefono_destinatario, direccion, ciudad_origen, ciudad_destino, peso, 
             volumen, observaciones, fecha_entrega_estimada, historial) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insertStmt.run(
            numero_guia, remitente, destinatario, telefono_remitente, telefono_destinatario,
            direccion, ciudad_origen, ciudad_destino, peso, volumen, observaciones,
            fecha_entrega, historial
        );

        res.json({ success: true, numero_guia });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Error al crear envío' });
    }
});

// Crear envío (alias)
app.post('/api/envios', (req, res) => {
    try {
        const {
            remitente, destinatario, telefono_remitente, telefono_destinatario,
            direccion, ciudad_origen, ciudad_destino, peso, volumen, observaciones
        } = req.body;

        // Generar número de guía
        const fecha = mexicoDateKey();
        const countStmt = db.prepare("SELECT COUNT(*) as count FROM envios");
        const countRow = countStmt.get();
        const numero = String((countRow?.count || 0) + 1).padStart(5, '0');
        const numero_guia = `EST-${fecha}-${numero}`;

        const fecha_entrega = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0];

        const historial = JSON.stringify([
            {
                fecha: mexicoDateTime(),
                estado: "Guía creada",
                descripcion: "Envío registrado en el sistema"
            }
        ]);

        const insertStmt = db.prepare(`
            INSERT INTO envios (numero_guia, remitente, destinatario, telefono_remitente, 
             telefono_destinatario, direccion, ciudad_origen, ciudad_destino, peso, 
             volumen, observaciones, fecha_entrega_estimada, historial) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insertStmt.run(
            numero_guia, remitente, destinatario, telefono_remitente, telefono_destinatario,
            direccion, ciudad_origen, ciudad_destino, peso, volumen, observaciones,
            fecha_entrega, historial
        );

        res.json({ success: true, numero_guia });
    } catch (err) {
        res.status(500).json({ error: 'Error al crear envío' });
    }
});

// Actualizar estado de envío (alias)
app.put('/api/actualizar-envio/:guia', (req, res) => {
    try {
        const { guia } = req.params;
        const { estado, descripcion } = req.body;

        const getStmt = db.prepare("SELECT * FROM envios WHERE numero_guia = ?");
        const row = getStmt.get(guia);

        if (!row) {
            return res.status(404).json({ success: false, error: 'Envío no encontrado' });
        }

        const historial = JSON.parse(row.historial || '[]');
        historial.push({
            fecha: mexicoDateTime(),
            estado: estado,
            descripcion: descripcion
        });

        const updateStmt = db.prepare(
            "UPDATE envios SET estado = ?, historial = ? WHERE numero_guia = ?"
        );
        updateStmt.run(estado, JSON.stringify(historial), guia);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Error al actualizar envío' });
    }
});

// Actualizar estado de envío
app.put('/api/envios/:guia', (req, res) => {
    try {
        const { guia } = req.params;
        const { estado, descripcion } = req.body;

        const getStmt = db.prepare("SELECT * FROM envios WHERE numero_guia = ?");
        const row = getStmt.get(guia);

        if (!row) {
            return res.status(404).json({ error: 'Envío no encontrado' });
        }

        const historial = JSON.parse(row.historial || '[]');
        historial.push({
            fecha: mexicoDateTime(),
            estado: estado,
            descripcion: descripcion
        });

        const updateStmt = db.prepare(
            "UPDATE envios SET estado = ?, historial = ? WHERE numero_guia = ?"
        );
        updateStmt.run(estado, JSON.stringify(historial), guia);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar envío' });
    }
});

// Generar PDF del envío - Etiqueta Profesional Estafeta
app.get('/api/pdf/:guia', (req, res) => {
    try {
        const { guia } = req.params;
        const getStmt = db.prepare("SELECT * FROM envios WHERE numero_guia = ?");
        const envio = getStmt.get(guia);

        if (!envio) {
            return res.status(404).json({ error: 'Envío no encontrado' });
        }

        const PDFDocument = require('pdfkit');
        const bwipjs = require('bwip-js');
        
        const doc = new PDFDocument({ size: 'LETTER', margin: 10 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="guia-${guia}.pdf"`);
        doc.pipe(res);

        // ===== SECCIÓN SUPERIOR: LOGO Y GUÍA =====
        // Logo ESTAFETA profesional - centrado y más pequeño
        doc.fontSize(24).font('Helvetica-Bold').fillColor('#E30613');
        doc.text('ESTAFETA', 0, 15, { align: 'center', width: 500 });
        
        // Recuadro amarillo con número de guía - debajo del logo
        doc.rect(80, 45, 340, 45).fillAndStroke('#FFD700', '#000000');
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000');
        doc.text('GUÍA:', 90, 52);
        doc.fontSize(20).font('Helvetica-Bold').fillColor('#000000');
        doc.text(guia.replace(/^EST-/, ''), 90, 62, { width: 320 });
        
        // Unidad
        doc.rect(380, 45, 60, 45).stroke();
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000');
        doc.text('UNIDAD', 385, 50);
        doc.fontSize(18).font('Helvetica-Bold');
        doc.text('1/1', 385, 63);
        
        // Tipo de servicio
        doc.rect(440, 45, 60, 45).stroke();
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000');
        doc.text('AS', 445, 50);
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('PAQ', 445, 63);
        doc.fontSize(8);
        doc.text('1-2', 445, 78);

        // ===== DATOS DE ORIGEN =====
        doc.rect(20, 100, 460, 65).stroke();
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000');
        doc.text('DE: DATOS DE ORIGEN', 25, 105);
        doc.fontSize(9).font('Helvetica');
        doc.text(envio.remitente, 25, 123);
        doc.text(envio.ciudad_origen, 25, 138);
        doc.text(`Tel: ${envio.telefono_remitente}`, 25, 153);

        // ===== DATOS DE DESTINO =====
        doc.rect(20, 170, 460, 75).stroke();
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000');
        doc.text('PARA: DATOS DE DESTINO', 25, 175);
        doc.fontSize(9).font('Helvetica');
        doc.text(envio.destinatario, 25, 193);
        doc.text(envio.ciudad_destino, 25, 208);
        doc.text(envio.direccion, 25, 223);
        doc.text(`Tel: ${envio.telefono_destinatario}`, 25, 238);

        // ===== PESO Y VOLUMEN =====
        doc.rect(20, 250, 460, 40).stroke();
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000');
        doc.text(`PESO: ${envio.peso} GR`, 25, 257);
        doc.text(`VOL: ${envio.volumen}cm`, 200, 257);
        if (envio.observaciones) {
            doc.fontSize(9);
            doc.text(`NOTAS: ${envio.observaciones}`, 25, 277);
        }

        // ===== FECHA Y HORA =====
        const ahora = new Date();
        const fecha = ahora.toLocaleDateString('es-MX', { timeZone: MEXICO_TIME_ZONE });
        const hora = ahora.toLocaleTimeString('es-MX', { timeZone: MEXICO_TIME_ZONE });
        
        doc.rect(20, 295, 460, 30).stroke();
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000');
        doc.text(`FECHA: ${fecha}`, 25, 302);
        doc.text(`HORA: ${hora}`, 350, 302);

        // ===== INFORMACIÓN INFERIOR =====
        doc.rect(20, 330, 460, 80).stroke();
        
        // Origen
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000');
        doc.text('Origen', 30, 340);
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text(envio.ciudad_origen.substring(0, 3).toUpperCase(), 30, 355);
        
        // QR (simulado)
        doc.fontSize(8).fillColor('#666666');
        doc.text('QR', 150, 355);
        
        // Destino
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000');
        doc.text('Destino', 250, 340);
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(envio.ciudad_destino, 250, 355);
        
        // Zona Hub
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000');
        doc.text('Zona Hub', 380, 340);
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text('304', 380, 355);
        doc.fontSize(8).font('Helvetica');
        doc.text('Equipo Reparto', 380, 373);
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text('72', 380, 385);

        doc.end();
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Error al generar PDF' });
    }
});

// Eliminar envío
app.delete('/api/envios/:guia', (req, res) => {
    try {
        const { guia } = req.params;

        const deleteStmt = db.prepare("DELETE FROM envios WHERE numero_guia = ?");
        deleteStmt.run(guia);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar envío' });
    }
});

// Iniciar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor ESTAFETA EXPRESS corriendo en http://localhost:${PORT}`);
});

// Timeout para graceful shutdown
server.setTimeout(30000);
