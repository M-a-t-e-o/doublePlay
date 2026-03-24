const http  = require('http');
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

  if (response.body.pagination) {
    console.log('Paginacion:');
    console.log(JSON.stringify(response.body.pagination, null, 2));
    console.log(`Juegos devueltos: ${response.body.data?.length ?? 0}`);
    if (response.body.data?.length > 0) {
      console.log('Primer juego:');
      console.log(JSON.stringify(response.body.data[0], null, 2));
    }
  } else {
    console.log('Body:');
    console.log(JSON.stringify(response.body, null, 2));
  }
  console.log('-------------------------\n');
}

async function run() {
  console.log('\n=== Games Module - Interactive Test Suite ===\n');

  const baseInput = await ask('Base URL [http://localhost:3000/api/games]: ');
  const baseUrl = baseInput || 'http://localhost:3000/api/games';

  const state = { lastId: '' };

  while (true) {
    console.log('Selecciona una opcion:');
    console.log('1) GET /api/games              - Catalogo basico (pagina 1)');
    console.log('2) GET /api/games?page&limit   - Paginacion personalizada');
    console.log('3) GET /api/games?search=      - Buscar por titulo');
    console.log('4) GET /api/games?genre=       - Filtrar por genero');
    console.log('5) GET /api/games?sort=        - Ordenar catalogo');
    console.log('6) GET /api/games?search+genre+sort - Combinacion de filtros');
    console.log('7) GET /api/games/genres/list  - Lista de generos disponibles');
    console.log('8) GET /api/games/:id          - Detalle de un juego');
    console.log('9) GET /api/games/:id          - ID invalido (debe dar 400)');
    console.log('0) Salir\n');

    const option = await ask('> ');

    try {
      if (option === '1') {
        const res = await requestJson(`${baseUrl}?page=1&limit=5`);
        if (res.ok && res.body.data?.length > 0) {
          state.lastId = res.body.data[0]._id;
          console.log(`\n(ID guardado para test 8: ${state.lastId})`);
        }
        printResponse('CATALOGO BASICO (page=1, limit=5)', res);

      } else if (option === '2') {
        const page  = await ask('Pagina [2]: ')  || '2';
        const limit = await ask('Limite [10]: ') || '10';
        const res = await requestJson(`${baseUrl}?page=${page}&limit=${limit}`);
        printResponse(`PAGINACION (page=${page}, limit=${limit})`, res);

      } else if (option === '3') {
        const search = await ask('Titulo a buscar [witcher]: ') || 'witcher';
        const res = await requestJson(`${baseUrl}?search=${encodeURIComponent(search)}&limit=5`);
        printResponse(`BUSQUEDA por titulo "${search}"`, res);

      } else if (option === '4') {
        const genre = await ask('Genero [Action]: ') || 'Action';
        const res = await requestJson(`${baseUrl}?genre=${encodeURIComponent(genre)}&limit=5`);
        printResponse(`FILTRO por genero "${genre}"`, res);

      } else if (option === '5') {
        console.log('Opciones: rating_desc | rating_asc | date_desc | date_asc | title_asc | reviews_desc');
        const sort = await ask('Ordenacion [date_desc]: ') || 'date_desc';
        const res = await requestJson(`${baseUrl}?sort=${sort}&limit=5`);
        printResponse(`ORDENACION por "${sort}"`, res);

      } else if (option === '6') {
        const search = await ask('Titulo [dark]: ')          || 'dark';
        const genre  = await ask('Genero [Action]: ')        || 'Action';
        const sort   = await ask('Orden [rating_desc]: ')    || 'rating_desc';
        const page   = await ask('Pagina [1]: ')             || '1';
        const url    = `${baseUrl}?search=${encodeURIComponent(search)}&genre=${encodeURIComponent(genre)}&sort=${sort}&page=${page}&limit=5`;
        const res = await requestJson(url);
        printResponse(`COMBINACION (search="${search}", genre="${genre}", sort="${sort}")`, res);

      } else if (option === '7') {
        const res = await requestJson(`${baseUrl}/genres/list`);
        printResponse('LISTA DE GENEROS', res);
        if (res.ok && Array.isArray(res.body)) {
          console.log(`Total generos disponibles: ${res.body.length}\n`);
        }

      } else if (option === '8') {
        const id = (await ask(`ID de juego [${state.lastId || 'ninguno guardado'}]: `)) || state.lastId;
        if (!id) {
          console.log('\nEjecuta primero el test 1 para guardar un ID automaticamente.\n');
          continue;
        }
        const res = await requestJson(`${baseUrl}/${id}`);
        printResponse(`DETALLE juego id="${id}"`, res);

      } else if (option === '9') {
        const res = await requestJson(`${baseUrl}/id-que-no-existe`);
        printResponse('ID INVALIDO (esperado 400)', res);

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

