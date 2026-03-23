require('dotenv').config({ path: './.env' });
const axios    = require('axios');
const mongoose = require('mongoose');
const Movie    = require('../module/movies/movie.model');
const { transform } = require('../module/movies/tmdbService');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const KEY       = process.env.TMDB_API_KEY;

// Espera N milisegundos (para respetar el rate limit de TMDb: 40 req/10s)
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Trae UNA página de resultados de un endpoint de listado ───
async function fetchPage(endpoint, page) {
  const { data } = await axios.get(`${TMDB_BASE}${endpoint}`, {
    params: { api_key: KEY, language: 'es-ES', page }
  });
  return data.results || [];
}

// ── Trae el detalle completo + trailer de UNA película ────────
async function fetchDetail(tmdbId) {
  const { data } = await axios.get(`${TMDB_BASE}/movie/${tmdbId}`, {
    params: {
      api_key:            KEY,
      language:           'es-ES',
      append_to_response: 'videos'
    }
  });
  return data;
}

// ── Procesa un lote de IDs: detalle + transform + upsert ──────
async function processIds(ids, label) {
  let saved = 0;
  for (const id of ids) {
    try {
      const raw = await fetchDetail(id);
      const doc = transform(raw);
      await Movie.findOneAndUpdate(
        { tmdbId: doc.tmdbId },
        doc,
        { upsert: true, returnDocument: 'after' }
      );
      saved++;
    } catch (err) {
      console.warn(`  ⚠ Error en tmdbId ${id}: ${err.message}`);
    }
    // 260ms entre peticiones → ~3.8 req/s, bien por debajo del límite de TMDb
    await sleep(260);
  }
  console.log(`  ✓ ${label}: ${saved} películas guardadas`);
  return saved;
}

// ── Recoge IDs de múltiples páginas de un endpoint ───────────
async function collectIds(endpoint, totalPages) {
  const ids = new Set();
  for (let page = 1; page <= totalPages; page++) {
    const results = await fetchPage(endpoint, page);
    results.forEach(m => ids.add(m.id));
    await sleep(260);
  }
  return [...ids];
}

// ── MAIN ──────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Conectado a MongoDB\n');

  let total = 0;

  // Bloque 1: películas populares (20 págs × 20 = hasta 400)
  console.log('→ Recogiendo populares...');
  const popularIds = await collectIds('/movie/popular', 20);
  total += await processIds(popularIds, 'Populares');

  // Bloque 2: mejor valoradas (20 págs × 20 = hasta 400)
  console.log('\n→ Recogiendo mejor valoradas...');
  const topIds = await collectIds('/movie/top_rated', 20);
  total += await processIds(topIds, 'Top rated');

  // Bloque 3: por géneros principales (10 págs × 20 = hasta 200 por género)
  // IDs de géneros en TMDb (español):
  // 28 Acción, 35 Comedia, 18 Drama, 27 Terror, 878 Ciencia ficción
  // 12 Aventura, 16 Animación, 80 Crimen, 53 Suspense, 10749 Romance
  const genres = [28, 35, 18, 27, 878, 12, 16, 80, 53, 10749];

  for (const genreId of genres) {
    console.log(`\n→ Recogiendo género ${genreId}...`);
    const ids = await collectIds(
      `/discover/movie?with_genres=${genreId}&sort_by=vote_count.desc`,
      10
    );
    total += await processIds(ids, `Género ${genreId}`);
  }

  // Contar cuántas hay realmente en BD (el upsert evita duplicados)
  const count = await Movie.countDocuments();
  console.log(`\n════════════════════════════════`);
  console.log(`Seed completado`);
  console.log(`Peticiones procesadas: ${total}`);
  console.log(`Películas únicas en BD: ${count}`);
  console.log(`════════════════════════════════`);

  await mongoose.disconnect();
}


// Para un mucho mayor catálogo
/*
async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Conectado a MongoDB\n');

  let total = 0;

  // ── Bloque 1: listas estándar de TMDb ─────────────────────────
  console.log('→ Populares...');
  total += await processIds(await collectIds('/movie/popular', 20), 'Populares');

  console.log('\n→ Mejor valoradas...');
  total += await processIds(await collectIds('/movie/top_rated', 20), 'Top rated');

  // Películas en cines ahora y próximos estrenos
  // Aporta contenido muy reciente que no sale en popular/top_rated
  console.log('\n→ En cines ahora...');
  total += await processIds(await collectIds('/movie/now_playing', 20), 'Now playing');

  console.log('\n→ Próximos estrenos...');
  total += await processIds(await collectIds('/movie/upcoming', 20), 'Upcoming');

  // ── Bloque 2: géneros — ampliar la lista original ─────────────
  // Añadidos: 36 Historia, 10402 Música, 9648 Misterio,
  //           10752 Bélica, 37 Western, 14 Fantasía, 99 Documental
  const genres = [
    28, 35, 18, 27, 878, 12, 16, 80, 53, 10749,  // los que ya tenías
    36, 10402, 9648, 10752, 37, 14, 99            // nuevos
  ];

  for (const genreId of genres) {
    console.log(`\n→ Género ${genreId}...`);
    total += await processIds(
      await collectIds(`/discover/movie?with_genres=${genreId}&sort_by=vote_count.desc`, 10),
      `Género ${genreId}`
    );
  }

  // ── Bloque 3: discover con distintos criterios de ordenación ───
  // Ordenar por revenue trae blockbusters que no salen por votos
  console.log('\n→ Discover por recaudación...');
  total += await processIds(
    await collectIds('/discover/movie?sort_by=revenue.desc', 20),
    'Revenue'
  );

  // Mejor valoradas con mínimo de votos (evita películas con 1 voto y 10 estrellas)
  console.log('\n→ Discover mejor valoradas (mín. 1000 votos)...');
  total += await processIds(
    await collectIds('/discover/movie?sort_by=vote_average.desc&vote_count.gte=1000', 20),
    'Vote average filtrado'
  );

  // ── Bloque 4: por décadas ──────────────────────────────────────
  // Esta es la estrategia más potente para volumen.
  // Divide el catálogo histórico de TMDb por franjas de años.
  // Cada franja puede tener hasta 10.000 resultados únicos.
  const decades = [
    { from: '1920-01-01', to: '1959-12-31', label: 'Clásicos (1920-1959)' },
    { from: '1960-01-01', to: '1979-12-31', label: '60s-70s' },
    { from: '1980-01-01', to: '1989-12-31', label: '80s' },
    { from: '1990-01-01', to: '1999-12-31', label: '90s' },
    { from: '2000-01-01', to: '2009-12-31', label: '2000s' },
    { from: '2010-01-01', to: '2019-12-31', label: '2010s' },
    { from: '2020-01-01', to: '2024-12-31', label: '2020s' },
  ];

  for (const decade of decades) {
    console.log(`\n→ ${decade.label}...`);
    const endpoint = `/discover/movie?sort_by=vote_count.desc`
      + `&primary_release_date.gte=${decade.from}`
      + `&primary_release_date.lte=${decade.to}`;
    total += await processIds(
      await collectIds(endpoint, 20),
      decade.label
    );
  }

  // ── Bloque 5: por idioma original ─────────────────────────────
  // Cine no anglosajón que rara vez aparece en los listados globales
  const languages = [
    { code: 'ja', label: 'Japonés' },   // anime, cine japonés
    { code: 'ko', label: 'Coreano' },   // cine coreano (Parasite, etc.)
    { code: 'fr', label: 'Francés' },
    { code: 'it', label: 'Italiano' },
    { code: 'de', label: 'Alemán' },
    { code: 'hi', label: 'Hindi' },     // Bollywood
    { code: 'zh', label: 'Chino' },
    { code: 'pt', label: 'Portugués' },
  ];

  for (const lang of languages) {
    console.log(`\n→ Cine en ${lang.label}...`);
    const endpoint = `/discover/movie?sort_by=vote_count.desc&with_original_language=${lang.code}`;
    total += await processIds(
      await collectIds(endpoint, 10),
      lang.label
    );
  }

  // ── Resultado final ───────────────────────────────────────────
  const count = await Movie.countDocuments();
  console.log(`\n════════════════════════════════`);
  console.log(`Seed completado`);
  console.log(`Peticiones procesadas: ${total}`);
  console.log(`Películas únicas en BD: ${count}`);
  console.log(`════════════════════════════════`);

  await mongoose.disconnect();
}
*/

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});