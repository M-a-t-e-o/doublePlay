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
          resolve({ status: res.statusCode || 0, ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300, body: parsed });
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
  console.log('\n=== Social Feed - Interactive Test Suite ===\n');

  const apiInput = await ask('API base [http://localhost:3000/api]: ');
  const apiBase  = apiInput || 'http://localhost:3000/api';

  const authBase   = `${apiBase}/auth`;
  const socialBase = `${apiBase}/social`;
  const friendBase = `${apiBase}/friends`;

  const state = {
    token:          '',
    email:          '',
    password:       '',
    lastRequestId:  ''  // ID de solicitud de amistad reciente
  };

  while (true) {
    console.log('Selecciona una opcion:');
    console.log('1)  Login');
    console.log('2)  GET  /social/feed (paginado)');
    console.log('3)  GET  /social/feed?page=2');
    console.log('4)  GET  /social/feed sin token (debe dar 401)');
    console.log('──── Amistad (para preparar datos del feed) ────');
    console.log('5)  POST /friends/request/:userId');
    console.log('6)  PUT  /friends/accept/:requestId');
    console.log('7)  GET  /friends (lista amigos)');
    console.log('8)  GET  /friends/requests/received');
    console.log('9)  GET  /friends/requests/sent');
    console.log('10) DELETE /friends/request/:requestId (cancelar/rechazar)');
    console.log('11) DELETE /friends/:userId (eliminar amistad)');
    console.log('12) Mostrar estado local');
    console.log('0)  Salir\n');

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
        }
        printResponse('LOGIN', res);

      } else if (option === '2') {
        const limit = (await ask('limit [20]: ')) || '20';
        const res = await requestJson(
          `${socialBase}/feed?page=1&limit=${limit}`,
          'GET', null,
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('GET SOCIAL FEED (page 1)', res);

      } else if (option === '3') {
        const page  = (await ask('page [2]: '))  || '2';
        const limit = (await ask('limit [20]: ')) || '20';
        const res = await requestJson(
          `${socialBase}/feed?page=${page}&limit=${limit}`,
          'GET', null,
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse(`GET SOCIAL FEED (page ${page})`, res);

      } else if (option === '4') {
        const res = await requestJson(`${socialBase}/feed`);
        printResponse('FEED SIN TOKEN (esperado 401)', res);

      } else if (option === '5') {
        const userId = await ask('User ID destino: ');
        if (!userId) { console.log('\nNecesitas un userId.\n'); continue; }

        const res = await requestJson(
          `${friendBase}/request/${userId}`,
          'POST', null,
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        if (res.ok && res.body?.friendship?._id) {
          state.lastRequestId = res.body.friendship._id;
        }
        printResponse('POST FRIEND REQUEST', res);

      } else if (option === '6') {
        const requestId = (await ask(`Request ID [${state.lastRequestId || 'none'}]: `)) || state.lastRequestId;
        if (!requestId) { console.log('\nNecesitas un requestId.\n'); continue; }

        const res = await requestJson(
          `${friendBase}/accept/${requestId}`,
          'PUT', null,
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('PUT ACCEPT FRIEND REQUEST', res);

      } else if (option === '7') {
        const res = await requestJson(
          `${friendBase}`,
          'GET', null,
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('GET FRIENDS', res);

      } else if (option === '8') {
        const res = await requestJson(
          `${friendBase}/requests/received`,
          'GET', null,
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('GET PENDING REQUESTS RECEIVED', res);

      } else if (option === '9') {
        const res = await requestJson(
          `${friendBase}/requests/sent`,
          'GET', null,
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('GET PENDING REQUESTS SENT', res);

      } else if (option === '10') {
        const requestId = (await ask(`Request ID [${state.lastRequestId || 'none'}]: `)) || state.lastRequestId;
        if (!requestId) { console.log('\nNecesitas un requestId.\n'); continue; }

        const res = await requestJson(
          `${friendBase}/request/${requestId}`,
          'DELETE', null,
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('DELETE FRIEND REQUEST (cancel/reject)', res);

      } else if (option === '11') {
        const userId = await ask('User ID del amigo a eliminar: ');
        if (!userId) { console.log('\nNecesitas un userId.\n'); continue; }

        const res = await requestJson(
          `${friendBase}/${userId}`,
          'DELETE', null,
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('DELETE FRIEND', res);

      } else if (option === '12') {
        console.log('\nEstado actual:');
        console.log(`email:         ${state.email          || '(vacio)'}`);
        console.log(`token:         ${state.token          ? '(guardado)' : '(vacio)'}`);
        console.log(`lastRequestId: ${state.lastRequestId  || '(vacio)'}`);
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