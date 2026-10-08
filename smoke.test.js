const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = __dirname;

function readIndex() {
  return fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
}

test('la página contiene el teléfono de contacto actualizado', () => {
  const html = readIndex();
  assert.match(html, /\+52 55 2096 2970/);
  assert.doesNotMatch(html, /1234-5678/);
});

test('el botón de WhatsApp usa el número actualizado', () => {
  const html = readIndex();
  assert.ok(html.includes('https://wa.me/525520962970'));
  assert.equal(html.includes('wa.me/5215512345678'), false);
});

test('la página conserva las rutas funcionales principales', () => {
  const html = readIndex();
  assert.match(html, /id="inicio"/);
  assert.match(html, /id="rastrear"/);
  assert.match(html, /id="cotizar"/);
  assert.match(html, /id="contacto"/);
  assert.match(html, /fetch\(`\/api\/envio\//);
});

test('el servidor usa el puerto proporcionado por Railway o el valor local por defecto', () => {
  const server = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');
  assert.match(server, /process\.env\.PORT \|\| 3000/);
});

test('las fechas dinámicas usan la zona horaria de Ciudad de México', () => {
  const server = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');
  assert.match(server, /America\/Mexico_City/);
  assert.match(server, /timeZone: MEXICO_TIME_ZONE/);
});

test('el PDF muestra solo el número dentro del recuadro de la guía', () => {
  const server = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');
  assert.ok(server.includes("guia.replace(/^EST-/, '')"));
});
