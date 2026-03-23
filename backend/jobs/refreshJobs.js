const cron  = require('node-cron');
const Movie = require('../module/movies/movie.model');
const { fetchFromTMDb, transform } = require('../module/movies/tmdbService');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const TTL_MS = 24 * 60 * 60 * 1000;

// Actualiza todas las películas con updatedAt > 24h
async function refreshStaleMovies() {
  const cutoff = new Date(Date.now() - TTL_MS);

  // Busca las caducadas ordenadas de más antigua a más reciente
  const stale = await Movie.find(
    { updatedAt: { $lt: cutoff } },
    { tmdbId: 1 }           // solo necesitamos el tmdbId
  ).sort({ updatedAt: 1 });

  console.log(`[CRON] Películas a refrescar: ${stale.length}`);

  let refreshed = 0, errors = 0;

  for (const movie of stale) {
    try {
      const raw = await fetchFromTMDb(movie.tmdbId);
      const doc = transform(raw);
      await Movie.findOneAndUpdate(
        { tmdbId: movie.tmdbId },
        doc,
        { upsert: false }   // aquí NO queremos insertar nuevas, solo actualizar
      );
      refreshed++;
    } catch (err) {
      errors++;
      console.warn(`[CRON] Error refrescando ${movie.tmdbId}: ${err.message}`);
    }
    await sleep(260); // respetamos el rate limit también aquí
  }

  console.log(`[CRON] Refresco completado: ${refreshed} ok, ${errors} errores`);
}

// Registra el job: se ejecuta cada día a las 3:00 AM
function initRefreshJobs() {
  // Formato cron: segundo minuto hora día mes díaSemana
  cron.schedule('0 3 * * *', () => {
    console.log('[CRON] Iniciando refresco de películas...');
    refreshStaleMovies().catch(err =>
      console.error('[CRON] Error inesperado:', err)
    );
  });

  console.log('✓ Cron job de refresco registrado (cada día a las 3:00 AM)');
}

module.exports = { initRefreshJobs };