/**
 * migrate_users.js
 *
 * Script de migración ONE-TIME para usuarios existentes sin los nuevos campos.
 * Ejecutar UNA sola vez antes de desplegar el nuevo código:
 *
 *   node scripts/migrate_users.js
 *
 * Qué hace:
 *  1. Rellena `role`     → 'user'  (en todos los que no lo tengan)
 *  2. Rellena `isBanned` → false   (en todos los que no lo tengan)
 *  3. Genera un `username` único a partir del email de cada usuario
 *     (parte local del email, saneada; añade sufijo numérico si colisiona)
 *
 * Es seguro volver a ejecutarlo: solo toca documentos que aún faltan.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../module/user/user.model');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convierte el local-part de un email en un username candidato.
 * Ejemplo: "Juan.Pérez+tag@gmail.com" → "juanperez"
 */
function emailToUsername(email) {
  return email
    .split('@')[0]          // parte antes del @
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')  // sustituye caracteres no válidos por _
    .replace(/_+/g, '_')          // colapsa guiones bajos consecutivos
    .replace(/^_|_$/g, '')        // elimina guiones bajos al inicio/fin
    .slice(0, 25);                // máx 25 para dejar hueco al sufijo
}

/**
 * Dado un username base, devuelve uno que no exista ya en la BD.
 * Prueba: base → base_2 → base_3 → ...
 */
async function resolveUniqueUsername(base, excludeId) {
  let candidate = base || 'user';
  let attempt   = 1;

  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const conflict = await User.findOne({
      username: candidate,
      _id: { $ne: excludeId }
    }).select('_id').lean();

    if (!conflict) return candidate;

    attempt += 1;
    candidate = `${base}_${attempt}`;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function migrate() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('ERROR: MONGODB_URI no está definida en el .env');
    process.exit(1);
  }

  console.log('Conectando a MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Conectado.\n');

  // Busca usuarios a los que les falte cualquiera de los tres campos
  const usersToMigrate = await User.find({
    $or: [
      { username: { $exists: false } },
      { username: null },
      { role:     { $exists: false } },
      { isBanned: { $exists: false } }
    ]
  }).lean();

  if (usersToMigrate.length === 0) {
    console.log('No hay usuarios que migrar. Todo está al día.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Usuarios a migrar: ${usersToMigrate.length}\n`);

  let migrated = 0;
  let errors   = 0;

  for (const u of usersToMigrate) {
    try {
      const update = {};

      // role
      if (!u.role) {
        update.role = 'user';
      }

      // isBanned
      if (u.isBanned === undefined || u.isBanned === null) {
        update.isBanned = false;
      }

      // username
      if (!u.username) {
        const base     = emailToUsername(u.email);
        const username = await resolveUniqueUsername(base, u._id);
        update.username = username;
      }

      // Usar updateOne con { strict: false } para saltarse la validación
      // del campo required durante la migración (el campo se está rellenando ahora)
      await User.updateOne(
        { _id: u._id },
        { $set: update },
        { runValidators: false }
      );

      console.log(
        `  ✓ ${u.email.padEnd(35)} → username: ${(update.username || u.username || '(ya tenía)').padEnd(25)} role: ${update.role || u.role}`
      );
      migrated++;

    } catch (err) {
      console.error(`  ✗ Error en ${u.email}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nMigración completada: ${migrated} actualizados, ${errors} errores.`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});