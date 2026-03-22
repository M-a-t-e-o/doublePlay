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
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          let parsed;
          try {
            parsed = data ? JSON.parse(data) : {};
          } catch {
            parsed = { raw: data };
          }

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
  console.log('\n=== DoublePlay Auth Interactive Tester ===\n');

  const baseInput = await ask('Base URL [http://localhost:3000/api/auth]: ');
  const baseUrl = baseInput || 'http://localhost:3000/api/auth';

  const state = {
    token: '',
    email: '',
    password: ''
  };

  while (true) {
    console.log('Selecciona una opcion:');
    console.log('1) Register');
    console.log('2) Login');
    console.log('3) Change password');
    console.log('4) Probar politica de contrasena (debe fallar)');
    console.log('5) Mostrar estado actual (token/email)');
    console.log('0) Salir');

    const option = await ask('> ');

    try {
      if (option === '1') {
        const name = await ask('Name: ');
        const email = await ask('Email: ');
        const password = await ask('Password: ');

        const res = await requestJson(`${baseUrl}/register`, 'POST', { name, email, password });
        state.email = email || state.email;
        state.password = password || state.password;

        printResponse('REGISTER', res);
      } else if (option === '2') {
        const email = (await ask(`Email [${state.email || 'none'}]: `)) || state.email;
        const password = (await ask(`Password [${state.password ? 'saved' : 'none'}]: `)) || state.password;

        const res = await requestJson(`${baseUrl}/login`, 'POST', { email, password });
        if (res.ok && res.body && res.body.token) {
          state.token = res.body.token;
          state.email = email;
          state.password = password;
        }

        printResponse('LOGIN', res);
      } else if (option === '3') {
        const token = (await ask(`Token [${state.token ? 'saved' : 'none'}]: `)) || state.token;
        const currentPassword = await ask('Current password: ');
        const newPassword = await ask('New password: ');

        const res = await requestJson(
          `${baseUrl}/change-password`,
          'POST',
          { currentPassword, newPassword },
          token ? { Authorization: `Bearer ${token}` } : {}
        );

        if (res.ok) {
          state.password = newPassword;
        }

        printResponse('CHANGE PASSWORD', res);
      } else if (option === '4') {
        const randomEmail = `policy_${Date.now()}@test.com`;
        const res = await requestJson(`${baseUrl}/register`, 'POST', {
          name: 'Policy Test',
          email: randomEmail,
          password: 'abc123'
        });

        printResponse('PASSWORD POLICY TEST (EXPECTED 400)', res);
      } else if (option === '5') {
        console.log('\nEstado actual:');
        console.log(`email: ${state.email || '(vacio)'}`);
        console.log(`token: ${state.token ? '(guardado)' : '(vacio)'}`);
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

run();
