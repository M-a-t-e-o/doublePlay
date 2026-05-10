const cron  = require('node-cron');
const Movie = require('../module/movies/movie.model');
const { fetchFromTMDb, transform } = require('../module/movies/tmdbService');
const { computeStats } = require('../module/stats/stats.service');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const TTL_MS = 24 * 60 * 60 * 1000;

// ── Job 1: Refresco de películas desde TMDb ───────────────────────────────────
// Actualiza todas las películas con updatedAt > 24h
async function refreshStaleMovies() {
  const cutoff = new Date(Date.now() - TTL_MS);

  const stale = await Movie.find(
    { updatedAt: { $lt: cutoff } },
    { tmdbId: 1 }
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
        { upsert: false }
      );
      refreshed++;
    } catch (err) {
      errors++;
      console.warn(`[CRON] Error refrescando ${movie.tmdbId}: ${err.message}`);
    }
    await sleep(260);
  }

  console.log(`[CRON] Refresco completado: ${refreshed} ok, ${errors} errores`);
}

// ── Job 2: Recálculo de stats de la plataforma ───────────────────────────────
async function refreshPlatformStats() {
  console.log('[CRON] Iniciando recálculo de stats...');
  try {
    await computeStats();
    console.log('[CRON] Stats actualizados correctamente');
  } catch (err) {
    console.error('[CRON] Error recalculando stats:', err.message);
  }
}

// ── Registro de jobs ──────────────────────────────────────────────────────────
function initRefreshJobs() {
  // Job 1: refresco de películas — cada día a las 3:00 AM
  cron.schedule('0 3 * * *', () => {
    console.log('[CRON] Iniciando refresco de películas...');
    refreshStaleMovies().catch(err =>
      console.error('[CRON] Error inesperado:', err)
    );
  });

  // Job 2: recálculo de stats — cada día a las 4:00 AM
  cron.schedule('0 4 * * *', () => {
    refreshPlatformStats().catch(err =>
      console.error('[CRON] Error inesperado en stats:', err)
    );
  });

  console.log('✓ Cron job de refresco de películas registrado (cada día a las 3:00 AM)');
  console.log('✓ Cron job de stats de plataforma registrado  (cada día a las 4:00 AM)');
}

module.exports = { initRefreshJobs };