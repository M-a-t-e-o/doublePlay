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

async function fetchFirstContentId(baseUrl) {
  const res = await requestJson(`${baseUrl}?page=1&limit=1`);
  if (res.ok && Array.isArray(res.body.data) && res.body.data.length > 0) {
    return res.body.data[0]._id;
  }
  return '';
}

async function run() {
  console.log('\n=== Interactions Module - Interactive Test Suite ===\n');

  const apiInput = await ask('API base [http://localhost:3000/api]: ');
  const apiBase = apiInput || 'http://localhost:3000/api';

  const authBase = `${apiBase}/auth`;
  const moviesBase = `${apiBase}/movies`;
  const gamesBase = `${apiBase}/games`;

  const state = {
    token: '',
    email: '',
    password: '',
    movieId: '',
    gameId: ''
  };

  while (true) {
    console.log('Selecciona una opcion:');
    console.log('1) Login (guardar token)');
    console.log('2) Cargar IDs automaticos (movie + game)');
    console.log('3) GET /movies/:id/interaction (requiere token)');
    console.log('4) PATCH /movies/:id/watched');
    console.log('5) PATCH /movies/:id/wishlist');
    console.log('6) PATCH /movies/:id/rating (1..5 o null)');
    console.log('7) GET /games/:id/interaction (requiere token)');
    console.log('8) PATCH /games/:id/watched');
    console.log('9) PATCH /games/:id/wishlist');
    console.log('10) PATCH /games/:id/rating (1..5 o null)');
    console.log('11) GET /movies/:id/views (conteo)');
    console.log('12) GET /games/:id/views (conteo)');
    console.log('13) Probar sin token (debe dar 401)');
    console.log('14) Mostrar estado local (token/ids)');
    console.log('0) Salir\n');

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
        const movieId = await fetchFirstContentId(moviesBase);
        const gameId = await fetchFirstContentId(gamesBase);

        state.movieId = movieId || state.movieId;
        state.gameId = gameId || state.gameId;

        console.log('\nIDs cargados:');
        console.log(`movieId: ${state.movieId || '(no disponible)'}`);
        console.log(`gameId: ${state.gameId || '(no disponible)'}`);
        console.log('');

      } else if (option === '3') {
        const id = (await ask(`Movie ID [${state.movieId || 'none'}]: `)) || state.movieId;
        if (!id) {
          console.log('\nCargar primero un ID con la opcion 2.\n');
          continue;
        }

        const res = await requestJson(
          `${moviesBase}/${id}/interaction`,
          'GET',
          null,
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('GET MOVIE INTERACTION', res);

      } else if (option === '4') {
        const id = (await ask(`Movie ID [${state.movieId || 'none'}]: `)) || state.movieId;
        const watchedRaw = (await ask('watched (true/false) [true]: ')) || 'true';
        if (!id) {
          console.log('\nCargar primero un ID con la opcion 2.\n');
          continue;
        }

        const watched = watchedRaw.toLowerCase() === 'true';
        const res = await requestJson(
          `${moviesBase}/${id}/watched`,
          'PATCH',
          { watched },
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('PATCH MOVIE WATCHED', res);

      } else if (option === '5') {
        const id = (await ask(`Movie ID [${state.movieId || 'none'}]: `)) || state.movieId;
        const wishlistRaw = (await ask('inWishlist (true/false) [true]: ')) || 'true';
        if (!id) {
          console.log('\nCargar primero un ID con la opcion 2.\n');
          continue;
        }

        const inWishlist = wishlistRaw.toLowerCase() === 'true';
        const res = await requestJson(
          `${moviesBase}/${id}/wishlist`,
          'PATCH',
          { inWishlist },
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('PATCH MOVIE WISHLIST', res);

      } else if (option === '6') {
        const id = (await ask(`Movie ID [${state.movieId || 'none'}]: `)) || state.movieId;
        const ratingRaw = (await ask('rating [5 | null]: ')) || '5';
        if (!id) {
          console.log('\nCargar primero un ID con la opcion 2.\n');
          continue;
        }

        const rating = ratingRaw.toLowerCase() === 'null' ? null : parseInt(ratingRaw, 10);
        const res = await requestJson(
          `${moviesBase}/${id}/rating`,
          'PATCH',
          { rating },
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('PATCH MOVIE RATING', res);

      } else if (option === '7') {
        const id = (await ask(`Game ID [${state.gameId || 'none'}]: `)) || state.gameId;
        if (!id) {
          console.log('\nCargar primero un ID con la opcion 2.\n');
          continue;
        }

        const res = await requestJson(
          `${gamesBase}/${id}/interaction`,
          'GET',
          null,
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('GET GAME INTERACTION', res);

      } else if (option === '8') {
        const id = (await ask(`Game ID [${state.gameId || 'none'}]: `)) || state.gameId;
        const watchedRaw = (await ask('watched (true/false) [true]: ')) || 'true';
        if (!id) {
          console.log('\nCargar primero un ID con la opcion 2.\n');
          continue;
        }

        const watched = watchedRaw.toLowerCase() === 'true';
        const res = await requestJson(
          `${gamesBase}/${id}/watched`,
          'PATCH',
          { watched },
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('PATCH GAME WATCHED', res);

      } else if (option === '9') {
        const id = (await ask(`Game ID [${state.gameId || 'none'}]: `)) || state.gameId;
        const wishlistRaw = (await ask('inWishlist (true/false) [true]: ')) || 'true';
        if (!id) {
          console.log('\nCargar primero un ID con la opcion 2.\n');
          continue;
        }

        const inWishlist = wishlistRaw.toLowerCase() === 'true';
        const res = await requestJson(
          `${gamesBase}/${id}/wishlist`,
          'PATCH',
          { inWishlist },
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('PATCH GAME WISHLIST', res);

      } else if (option === '10') {
        const id = (await ask(`Game ID [${state.gameId || 'none'}]: `)) || state.gameId;
        const ratingRaw = (await ask('rating [5 | null]: ')) || '5';
        if (!id) {
          console.log('\nCargar primero un ID con la opcion 2.\n');
          continue;
        }

        const rating = ratingRaw.toLowerCase() === 'null' ? null : parseInt(ratingRaw, 10);
        const res = await requestJson(
          `${gamesBase}/${id}/rating`,
          'PATCH',
          { rating },
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('PATCH GAME RATING', res);

      } else if (option === '11') {
        const id = (await ask(`Movie ID [${state.movieId || 'none'}]: `)) || state.movieId;
        if (!id) {
          console.log('\nCargar primero un ID con la opcion 2.\n');
          continue;
        }

        const res = await requestJson(`${moviesBase}/${id}/views`);
        printResponse('GET MOVIE VIEWS COUNT', res);

      } else if (option === '12') {
        const id = (await ask(`Game ID [${state.gameId || 'none'}]: `)) || state.gameId;
        if (!id) {
          console.log('\nCargar primero un ID con la opcion 2.\n');
          continue;
        }

        const res = await requestJson(`${gamesBase}/${id}/views`);
        printResponse('GET GAME VIEWS COUNT', res);

      } else if (option === '13') {
        const id = (await ask(`Movie ID [${state.movieId || 'none'}]: `)) || state.movieId;
        if (!id) {
          console.log('\nCargar primero un ID con la opcion 2.\n');
          continue;
        }

        const res = await requestJson(`${moviesBase}/${id}/interaction`);
        printResponse('UNAUTHORIZED TEST (EXPECTED 401)', res);

      } else if (option === '14') {
        console.log('\nEstado actual:');
        console.log(`email: ${state.email || '(vacio)'}`);
        console.log(`token: ${state.token ? '(guardado)' : '(vacio)'}`);
        console.log(`movieId: ${state.movieId || '(vacio)'}`);
        console.log(`gameId: ${state.gameId || '(vacio)'}`);
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
