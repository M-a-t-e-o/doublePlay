const http = require('http');
const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function requestJson(urlString, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const transport = url.protocol === 'https:' ? https : http;
    const payload = body ? JSON.stringify(body) : null;

    const req = transport.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...headers
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          let parsed;
          try { parsed = data ? JSON.parse(data) : {}; }
          catch { parsed = { raw: data }; }
          resolve({
            status: res.statusCode || 0,
            ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
            body: parsed
          });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function printResponse(label, response) {
  console.log(`\n--- ${label} ---`);
  console.log(`Status: ${response.status}`);
  console.log('Body:');
  console.log(JSON.stringify(response.body, null, 2));
  console.log('-------------------------\n');
}

async function run() {
  console.log('\n=== Admin Module - Interactive Test Suite ===\n');

  const apiInput = await ask('API base [http://localhost:3000/api]: ');
  const apiBase  = apiInput || 'http://localhost:3000/api';

  const authBase  = `${apiBase}/auth`;
  const adminBase = `${apiBase}/admin`;

  const state = {
    token:    '',
    email:    '',
    password: '',
    role:     ''
  };

  while (true) {
    console.log('Selecciona una opcion:');
    console.log('1) Login');
    console.log('2) GET /admin  → con token guardado');
    console.log('3) GET /admin  → sin token          (debe dar 401)');
    console.log('4) GET /admin  → con token de user  (debe dar 403)');
    console.log('5) Mostrar estado actual');
    console.log('0) Salir\n');

    const option = await ask('> ');

    try {
      if (option === '1') {
        const email    = (await ask(`Email [${state.email || 'none'}]: `))                || state.email;
        const password = (await ask(`Password [${state.password ? 'saved' : 'none'}]: `)) || state.password;

        const res = await requestJson(`${authBase}/login`, 'POST', { email, password });

        if (res.ok && res.body?.token) {
          state.token    = res.body.token;
          state.email    = email;
          state.password = password;
          state.role     = res.body.role || '';
          console.log(`\n[!] Rol del usuario: ${state.role}\n`);
        }

        printResponse('LOGIN', res);

      } else if (option === '2') {
        if (!state.token) {
          console.log('\n[!] No hay token guardado. Haz login primero (opción 1).\n');
          continue;
        }

        const res = await requestJson(
          adminBase,
          'GET',
          null,
          { Authorization: `Bearer ${state.token}` }
        );

        printResponse(`GET /admin (rol actual: ${state.role || '?'})`, res);

      } else if (option === '3') {
        // Sin cabecera Authorization — debe dar 401
        const res = await requestJson(adminBase);
        printResponse('GET /admin SIN TOKEN (EXPECTED 401)', res);

      } else if (option === '4') {
        // Pide un token manualmente para poder meter uno de user normal
        // aunque el estado tenga el de admin (o al revés)
        const token = await ask('Pega el token de un usuario con rol "user": ');
        if (!token) {
          console.log('\n[!] Token vacío, operación cancelada.\n');
          continue;
        }

        const res = await requestJson(
          adminBase,
          'GET',
          null,
          { Authorization: `Bearer ${token}` }
        );

        printResponse('GET /admin CON TOKEN DE USER (EXPECTED 403)', res);

      } else if (option === '5') {
        console.log('\nEstado actual:');
        console.log(`email:    ${state.email    || '(vacio)'}`);
        console.log(`role:     ${state.role     || '(vacio)'}`);
        console.log(`token:    ${state.token    ? '(guardado)' : '(vacio)'}`);
        console.log(`password: ${state.password ? '(guardada)' : '(vacia)'}`);
        console.log('');

      } else if (option === '0') {
        console.log('\nSaliendo...');
        break;

      } else {
        console.log('\nOpcion no valida.\n');
      }
    } catch (error) {
      console.error('\nError en la peticion:', error.message || error);
      console.log('');
    }
  }

  rl.close();
}

module.exports = { run };