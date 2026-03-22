const axios  = require('axios');
const Movie  = require('./movie.model');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE  = 'https://image.tmdb.org/t/p/w500';
const KEY       = process.env.TMDB_API_KEY;

// ── Transforma el JSON bruto de TMDb a tu schema ──────────────
function transform(raw) {

  // genres viene como [{id:28, name:"Acción"}, ...]
  // Solo nos quedamos con los nombres
  const genres = (raw.genres || []).map(g => g.name);

  // videos.results es un array de clips: trailers, teasers, etc.
  // Filtramos el primer Trailer oficial de YouTube
  const trailer = (raw.videos?.results || []).find(
    v => v.type === 'Trailer' && v.site === 'YouTube'
  );

  return {
    tmdbId:           raw.id,
    title:            raw.title,
    originalTitle:    raw.original_title,
    description:      raw.overview || '',
    releaseDate:      raw.release_date ? new Date(raw.release_date) : null,
    // poster_path es relativo ("/abc.jpg") — construimos la URL completa aquí
    posterUrl:        raw.poster_path   ? IMG_BASE + raw.poster_path   : null,
    //backdropUrl:      raw.backdrop_path ? IMG_BASE + raw.backdrop_path : null,
    trailerYoutubeId: trailer?.key || null,
    genres,
    language:         raw.original_language,
    runtime:          raw.runtime || 0,
    isAdult:          raw.adult   || false,
    //externalRating:   raw.vote_average || 0,
    updatedAt:        new Date()
    // rating y views no se tocan aquí: son datos propios de doublePlay
  };
}

// ── Trae el detalle completo de UNA película desde TMDb ───────
async function fetchFromTMDb(tmdbId) {
  const { data } = await axios.get(`${TMDB_BASE}/movie/${tmdbId}`, {
    params: {
      api_key:            KEY,
      language:           'es-ES',
      append_to_response: 'videos'   // trailer en la misma petición, sin coste extra
    }
  });
  return data;
}

// ── Cache-aside: sirve desde BD o refresca desde TMDb ────────
const TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

async function getMovieById(tmdbId) {
  const cached = await Movie.findOne({ tmdbId });

  const isStale = !cached ||
    (Date.now() - new Date(cached.updatedAt).getTime()) > TTL_MS;

  if (!isStale) return cached;  // dato fresco → lo devolvemos directamente

  // dato inexistente o caducado → vamos a TMDb
  const raw = await fetchFromTMDb(tmdbId);
  const doc = transform(raw);

  return Movie.findOneAndUpdate(
    { tmdbId },
    doc,
    { upsert: true, returnDocument: 'after' } // devuelve el documento actualizado
  );
}

module.exports = { transform, fetchFromTMDb, getMovieById };