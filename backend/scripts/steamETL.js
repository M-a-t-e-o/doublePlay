require('dotenv').config({ path: './.env' });
const fs       = require('fs');
const path     = require('path');
const mongoose = require('mongoose');
const JSONStream = require('JSONStream');
const Game     = require('../module/games/game.model');

// Géneros y tags que indican contenido sexual explícito
const SEXUAL_GENRES = new Set([
  'Sexual Content',
  'Nudity'
]);

const SEXUAL_TAGS = new Set([
  'Sexual Content',
  'Nudity', 
  'Adult Content',
  'NSFW',
  'Hentai',
  'Eroge'
]);

// ── Parsea fechas en texto libre de Steam ─────────────────────
function parseDate(str) {
  if (!str) return null;
  if (str.toLowerCase().includes('soon')) return null;
  if (str.toLowerCase().includes('tbd'))  return null;
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// ── Transforma un juego al schema de Mongoose ─────────────────
function transform(appId, raw) {
  const tags = raw.tags ? Object.keys(raw.tags) : [];

  return {
    steamAppId:  appId,
    title:       raw.name,
    description: raw.short_description || '',
    genres:      raw.genres      || [],
    tags,
    releaseDate: parseDate(raw.release_date),
    coverUrl:    raw.header_image || null,
    price:       raw.price || 0,
    platforms: {
      windows: raw.windows || false,
      mac:     raw.mac     || false,
      linux:   raw.linux   || false
    },
    developers: raw.developers || [],
    importedAt: new Date()
  };
}

// ── Filtro de calidad ─────────────────────────────────────────
function passesFilter(raw) {
  if (!raw.name)                               return false;
  if (!raw.short_description)                  return false;
  if (!raw.genres || raw.genres.length === 0)  return false;
  if ((raw.positive || 0) < 100)               return false;

  // Excluir por género oficial de Steam
  const genres = raw.genres || [];
  if (genres.some(g => SEXUAL_GENRES.has(g)))  return false;

  // Excluir por tags de comunidad
  const tags = raw.tags ? Object.keys(raw.tags) : [];
  if (tags.some(t => SEXUAL_TAGS.has(t)))      return false;

  return true;
}

// ── Vacía y ejecuta un lote de operaciones bulkWrite ──────────
async function flushBatch(operations) {
  if (operations.length === 0) return 0;
  try {
    const result = await Game.bulkWrite(operations, { ordered: false });
    return result.upsertedCount + result.modifiedCount;
  } catch (err) {
    console.warn(`  ⚠ Error en lote: ${err.message}`);
    return 0;
  }
}

// ── MAIN ──────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Conectado a MongoDB\n');

  const filePath = path.join(__dirname, '../data/games.json');

  if (!fs.existsSync(filePath)) {
    console.error('❌ No se encuentra backend/data/games.json');
    process.exit(1);
  }

  console.log('📂 Leyendo games.json en streaming...\n');

  const BATCH_SIZE = 100;
  let operations = [];
  let processed  = 0;
  let inserted   = 0;
  let skipped    = 0;

  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath)
      .pipe(JSONStream.parse('$*'));  // $* emite cada par {key, value} del objeto raíz

    stream.on('data', async ({ key: appId, value: game }) => {
      processed++;

      if (!passesFilter(game)) {
        skipped++;
        return;
      }

      operations.push({
        updateOne: {
          filter: { steamAppId: appId },
          update: { $set: transform(appId, game) },
          upsert: true
        }
      });

      if (operations.length >= BATCH_SIZE) {
        stream.pause();
        inserted += await flushBatch(operations);
        operations = [];

        if (processed % 10000 === 0) {
          const pct = Math.round((processed / 124146) * 100);
          console.log(`  Progreso: ${processed.toLocaleString()} (${pct}%) | Importados: ${inserted.toLocaleString()} | Saltados: ${skipped.toLocaleString()}`);
        }

        stream.resume();
      }
    });

    stream.on('end', async () => {
      inserted += await flushBatch(operations);
      resolve();
    });

    stream.on('error', reject);
  });

  const count = await Game.countDocuments();

  console.log(`\n════════════════════════════════`);
  console.log(`ETL completado`);
  console.log(`Procesados:  ${processed.toLocaleString()}`);
  console.log(`Importados:  ${inserted.toLocaleString()}`);
  console.log(`Saltados:    ${skipped.toLocaleString()}`);
  console.log(`────────────────────────────────`);
  console.log(`Juegos únicos en BD: ${count.toLocaleString()}`);
  console.log(`════════════════════════════════`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
