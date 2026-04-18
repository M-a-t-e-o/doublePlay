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
  console.log(JSON.stringify(response.body, null, 2));
  console.log('-------------------------\n');
}

async function run() {
  console.log('\n=== Profile Module - Interactive Test Suite ===\n');

  const apiInput = await ask('API base [http://localhost:3000/api]: ');
  const apiBase = apiInput || 'http://localhost:3000/api';

  const authBase = `${apiBase}/auth`;
  const profileBase = `${apiBase}/profile`;

  const state = {
    token: '',
    email: '',
    password: ''
  };

  while (true) {
    console.log('Selecciona una opcion:');
    console.log('1)  Login');
    console.log('2)  GET  /profile/me');
    console.log('3)  GET  /profile/me/movies/watched?page=1&limit=5');
    console.log('4)  GET  /profile/me/games/played?page=1&limit=5');
    console.log('5)  GET  /profile/me/movies/wishlisted?page=1&limit=5');
    console.log('6)  GET  /profile/me/games/wishlisted?page=1&limit=5');
    console.log('7)  GET  /profile/me sin token (debe dar 401)');
    console.log('8)  Mostrar estado local');
    console.log('0)  Salir\n');

    const option = await ask('> ');

    try {
      if (option === '1') {
        const email = (await ask(`Email [${state.email || 'none'}]: `)) || state.email;
        const password = (await ask(`Password [${state.password ? 'saved' : 'none'}]: `)) || state.password;

        const res = await requestJson(`${authBase}/login`, 'POST', { email, password });
        if (res.ok && res.body?.token) {
          state.token = res.body.token;
          state.email = email;
          state.password = password;
        }
        printResponse('LOGIN', res);

      } else if (option === '2') {
        const res = await requestJson(
          `${profileBase}/me`,
          'GET',
          null,
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('GET PROFILE SUMMARY', res);

      } else if (option === '3') {
        const res = await requestJson(
          `${profileBase}/me/movies/watched?page=1&limit=5`,
          'GET',
          null,
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('GET WATCHED MOVIES', res);

      } else if (option === '4') {
        const res = await requestJson(
          `${profileBase}/me/games/played?page=1&limit=5`,
          'GET',
          null,
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('GET PLAYED GAMES', res);

      } else if (option === '5') {
        const res = await requestJson(
          `${profileBase}/me/movies/wishlisted?page=1&limit=5`,
          'GET',
          null,
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('GET WISHLISTED MOVIES', res);

      } else if (option === '6') {
        const res = await requestJson(
          `${profileBase}/me/games/wishlisted?page=1&limit=5`,
          'GET',
          null,
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('GET WISHLISTED GAMES', res);

      } else if (option === '7') {
        const res = await requestJson(`${profileBase}/me`);
        printResponse('PROFILE SUMMARY SIN TOKEN (esperado 401)', res);

      } else if (option === '8') {
        console.log('\nEstado actual:');
        console.log(`email: ${state.email || '(vacio)'}`);
        console.log(`token: ${state.token ? '(guardado)' : '(vacio)'}`);
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