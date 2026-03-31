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
  console.log('\n=== Reviews Module - Interactive Test Suite ===\n');

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
    gameId: '',
    lastMovieReviewId: '',
    lastGameReviewId: ''
  };

  while (true) {
    console.log('Selecciona una opcion:');
    console.log('1) Login');
    console.log('2) Cargar IDs automaticos (movie + game)');
    console.log('3) POST /movies/:id/reviews');
    console.log('4) GET /movies/:id/reviews');
    console.log('5) POST /movies/:id/reviews/:reviewId/replies');
    console.log('6) PATCH /movies/:id/reviews/:reviewId');
    console.log('7) DELETE /movies/:id/reviews/:reviewId');
    console.log('8) POST /games/:id/reviews');
    console.log('9) GET /games/:id/reviews');
    console.log('10) POST /games/:id/reviews/:reviewId/replies');
    console.log('11) PATCH /games/:id/reviews/:reviewId');
    console.log('12) DELETE /games/:id/reviews/:reviewId');
    console.log('13) Mostrar estado local');
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
        state.movieId = (await fetchFirstContentId(moviesBase)) || state.movieId;
        state.gameId = (await fetchFirstContentId(gamesBase)) || state.gameId;
        console.log('\nIDs cargados:');
        console.log(`movieId: ${state.movieId || '(no disponible)'}`);
        console.log(`gameId: ${state.gameId || '(no disponible)'}`);
        console.log('');

      } else if (option === '3') {
        const id = (await ask(`Movie ID [${state.movieId || 'none'}]: `)) || state.movieId;
        const rating = parseInt((await ask('Rating [5]: ')) || '5', 10);
        const content = (await ask('Content [Great movie!]: ')) || 'Great movie!';
        if (!id) {
          console.log('\nCargar primero un ID con la opcion 2.\n');
          continue;
        }

        const res = await requestJson(
          `${moviesBase}/${id}/reviews`,
          'POST',
          { rating, content },
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        if (res.ok && res.body?.id) {
          state.lastMovieReviewId = res.body.id;
        }
        printResponse('POST MOVIE REVIEW', res);

      } else if (option === '4') {
        const id = (await ask(`Movie ID [${state.movieId || 'none'}]: `)) || state.movieId;
        if (!id) {
          console.log('\nCargar primero un ID con la opcion 2.\n');
          continue;
        }

        const res = await requestJson(`${moviesBase}/${id}/reviews`);
        if (res.ok && Array.isArray(res.body.data) && res.body.data.length > 0) {
          state.lastMovieReviewId = res.body.data[0].id;
        }
        printResponse('GET MOVIE REVIEWS', res);

      } else if (option === '5') {
        const id = (await ask(`Movie ID [${state.movieId || 'none'}]: `)) || state.movieId;
        const reviewId = (await ask(`Root review ID [${state.lastMovieReviewId || 'none'}]: `)) || state.lastMovieReviewId;
        const content = (await ask('Reply content [I agree]: ')) || 'I agree';
        if (!id || !reviewId) {
          console.log('\nNecesitas movieId y reviewId.\n');
          continue;
        }

        const res = await requestJson(
          `${moviesBase}/${id}/reviews/${reviewId}/replies`,
          'POST',
          { content },
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('POST MOVIE REVIEW REPLY', res);

      } else if (option === '6') {
        const id = (await ask(`Movie ID [${state.movieId || 'none'}]: `)) || state.movieId;
        const reviewId = (await ask(`Review ID [${state.lastMovieReviewId || 'none'}]: `)) || state.lastMovieReviewId;
        const ratingRaw = await ask('Rating [leave empty to keep]: ');
        const contentRaw = await ask('Content [leave empty to keep]: ');
        if (!id || !reviewId) {
          console.log('\nNecesitas movieId y reviewId.\n');
          continue;
        }

        const payload = {};
        if (ratingRaw !== '') payload.rating = parseInt(ratingRaw, 10);
        if (contentRaw !== '') payload.content = contentRaw;

        const res = await requestJson(
          `${moviesBase}/${id}/reviews/${reviewId}`,
          'PATCH',
          payload,
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('PATCH MOVIE REVIEW', res);

      } else if (option === '7') {
        const id = (await ask(`Movie ID [${state.movieId || 'none'}]: `)) || state.movieId;
        const reviewId = (await ask(`Review ID [${state.lastMovieReviewId || 'none'}]: `)) || state.lastMovieReviewId;
        if (!id || !reviewId) {
          console.log('\nNecesitas movieId y reviewId.\n');
          continue;
        }

        const res = await requestJson(
          `${moviesBase}/${id}/reviews/${reviewId}`,
          'DELETE',
          null,
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('DELETE MOVIE REVIEW', res);

      } else if (option === '8') {
        const id = (await ask(`Game ID [${state.gameId || 'none'}]: `)) || state.gameId;
        const rating = parseInt((await ask('Rating [5]: ')) || '5', 10);
        const content = (await ask('Content [Great game!]: ')) || 'Great game!';
        if (!id) {
          console.log('\nCargar primero un ID con la opcion 2.\n');
          continue;
        }

        const res = await requestJson(
          `${gamesBase}/${id}/reviews`,
          'POST',
          { rating, content },
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        if (res.ok && res.body?.id) {
          state.lastGameReviewId = res.body.id;
        }
        printResponse('POST GAME REVIEW', res);

      } else if (option === '9') {
        const id = (await ask(`Game ID [${state.gameId || 'none'}]: `)) || state.gameId;
        if (!id) {
          console.log('\nCargar primero un ID con la opcion 2.\n');
          continue;
        }

        const res = await requestJson(`${gamesBase}/${id}/reviews`);
        if (res.ok && Array.isArray(res.body.data) && res.body.data.length > 0) {
          state.lastGameReviewId = res.body.data[0].id;
        }
        printResponse('GET GAME REVIEWS', res);

      } else if (option === '10') {
        const id = (await ask(`Game ID [${state.gameId || 'none'}]: `)) || state.gameId;
        const reviewId = (await ask(`Root review ID [${state.lastGameReviewId || 'none'}]: `)) || state.lastGameReviewId;
        const content = (await ask('Reply content [I agree]: ')) || 'I agree';
        if (!id || !reviewId) {
          console.log('\nNecesitas gameId y reviewId.\n');
          continue;
        }

        const res = await requestJson(
          `${gamesBase}/${id}/reviews/${reviewId}/replies`,
          'POST',
          { content },
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('POST GAME REVIEW REPLY', res);

      } else if (option === '11') {
        const id = (await ask(`Game ID [${state.gameId || 'none'}]: `)) || state.gameId;
        const reviewId = (await ask(`Review ID [${state.lastGameReviewId || 'none'}]: `)) || state.lastGameReviewId;
        const ratingRaw = await ask('Rating [leave empty to keep]: ');
        const contentRaw = await ask('Content [leave empty to keep]: ');
        if (!id || !reviewId) {
          console.log('\nNecesitas gameId y reviewId.\n');
          continue;
        }

        const payload = {};
        if (ratingRaw !== '') payload.rating = parseInt(ratingRaw, 10);
        if (contentRaw !== '') payload.content = contentRaw;

        const res = await requestJson(
          `${gamesBase}/${id}/reviews/${reviewId}`,
          'PATCH',
          payload,
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('PATCH GAME REVIEW', res);

      } else if (option === '12') {
        const id = (await ask(`Game ID [${state.gameId || 'none'}]: `)) || state.gameId;
        const reviewId = (await ask(`Review ID [${state.lastGameReviewId || 'none'}]: `)) || state.lastGameReviewId;
        if (!id || !reviewId) {
          console.log('\nNecesitas gameId y reviewId.\n');
          continue;
        }

        const res = await requestJson(
          `${gamesBase}/${id}/reviews/${reviewId}`,
          'DELETE',
          null,
          state.token ? { Authorization: `Bearer ${state.token}` } : {}
        );
        printResponse('DELETE GAME REVIEW', res);

      } else if (option === '13') {
        console.log('\nEstado actual:');
        console.log(`email: ${state.email || '(vacio)'}`);
        console.log(`token: ${state.token ? '(guardado)' : '(vacio)'}`);
        console.log(`movieId: ${state.movieId || '(vacio)'}`);
        console.log(`gameId: ${state.gameId || '(vacio)'}`);
        console.log(`lastMovieReviewId: ${state.lastMovieReviewId || '(vacio)'}`);
        console.log(`lastGameReviewId: ${state.lastGameReviewId || '(vacio)'}`);
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
