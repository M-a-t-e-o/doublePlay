require('dotenv').config({ path: '../.env' });
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
        { upsert: true, new: true }
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

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});