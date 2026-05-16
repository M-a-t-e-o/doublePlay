/**
 * utils/logger.js
 *
 * Configuración centralizada del sistema de logging del backend mediante Winston.
 *
 * Define un logger reutilizable para registrar información, avisos y errores
 * de forma estructurada, sustituyendo el uso directo de console.log,
 * console.warn y console.error en los módulos principales del backend.
 */

const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

module.exports = logger;