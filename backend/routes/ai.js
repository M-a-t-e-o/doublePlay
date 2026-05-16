/**
 * routes/ai.js
 *
 * Define los endpoints relacionados con el sistema de recomendación mediante IA.
 *
 * Carga catálogos de películas y videojuegos desde fuentes CSV externas,
 * selecciona candidatos relevantes según la consulta del usuario y utiliza
 * un modelo de lenguaje externo para generar recomendaciones conversacionales.
 *
 * Todas las rutas de este módulo requieren autenticación mediante JWT.
 */
const router = require('express').Router();
let mistralClient = null;

async function getMistral() {
    if (!mistralClient) {
        const { Mistral } = await import('@mistralai/mistralai');
        mistralClient = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
    }
    return mistralClient;
}

const { authRequired } = require('../middleware/auth');
const axios = require('axios');
const csv = require('csv-parser');
const logger = require('../utils/logger');


logger.info(process.env.MISTRAL_API_KEY ? 'Mistral API key loaded' : 'Mistral API key missing');
const urlMovies = process.env.URL_MOVIES_SUPABASE;
const urlGames = process.env.URL_GAMES_SUPABASE;

logger.info(urlMovies ? `Movies URL loaded: ${urlMovies}` : 'Movies URL missing');
logger.info(urlGames ? `Games URL loaded: ${urlGames}` : 'Games URL missing');





let peliculas = [];
let juegos = [];

async function loadData(url, type) {
    try {
        const response = await axios.get(url, { responseType: 'stream' });
        const resultados = [];

        return new Promise((resolve, reject) => {
            response.data
                .pipe(csv())
                .on('data', (data) => {
                    resultados.push({ ...data, tipo_item: type });
                })
                .on('end', () => resolve(resultados))
                .on('error', (err) => {
                    logger.error(`CSV parse error for ${type}`, { error: err.message, stack: err.stack });
                    reject(err);
                });
        });
    }
    catch (error) {
        logger.error(`Error loading ${type} data`, { error: error.message, stack: error.stack });
        return [];
    }
}


async function inicializarCatalogo() {
    logger.info('Cargando catálogos de películas y juegos...');
    peliculas = await loadData(urlMovies, 'pelicula');
    juegos = await loadData(urlGames, 'juego');
    logger.info(`Cargados ${peliculas.length} películas y ${juegos.length} juegos.`);
    logger.info('Catálogos inicializados');
}

// Start loading catalogs asynchronously (don't block module load)
inicializarCatalogo();

function buildSystemInstruction() {
    return `You are an assistant that helps users find movies and games to play\n` +
        `You provide recommendations based on user preferences and whatever the user ask you.\n` +
        `Decide from the user's message whether the request is about movies or videogames. Do not use any backend keyword filtering.\n` +
    `If the request is about movies or videogames, answer directly with a recommendation from the provided candidates. Do not start with an apology, refusal, or disclaimer.\n` +
    `Only reject requests that are clearly outside movies and videogames, and if you reject, do not include any recommendation.\n` +
    `When you recommend something, write like a human: 1 or 2 short conversational sentences, mention why it fits, and include the title naturally in the text.\n` +
    `Briefly describe at least one of the two elements involved in the recommendation: the recommended movie/game, the movie/game referenced by the user, or both if the information is available from the candidates.\n` +
    `If the user asks for a game, the final answer must be a videogame. If the user asks for a movie, the final answer must be a movie. Do not switch the medium in the final answer.\n` +
    `When the user mentions a movie and asks for a similar game, use the movie only as a reference for tone, themes, or genre, but the recommendation itself must be a videogame from GAME_CANDIDATES.\n` +
        `You can only recommend movies and videogames that are in these catalogs. Use only the items listed in the provided candidates.\n` +
        `If the request mentions a movie and asks for a similar game, recommend the closest game from the candidates even if there is no exact match.\n`;
}

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function tokenize(value) {
    return normalizeText(value)
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .filter(token => token.length > 2);
}

function itemText(item) {
    return [item.title, item.description, item.genres, item.tags]
        .filter(Boolean)
        .join(' ');
}

function parseArrayLikeField(value) {
    if (!value) {
        return [];
    }

    if (Array.isArray(value)) {
        return value.map(entry => normalizeText(entry));
    }

    const text = String(value).trim();

    try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
            return parsed.map(entry => normalizeText(entry));
        }
    } catch (error) {
        // Ignore parse failures and fall back to plain text splitting.
    }

    return text
        .replace(/^\[|\]$/g, '')
        .split(/[;,|]/)
        .map(entry => normalizeText(entry))
        .filter(Boolean);
}

function collectFieldTokens(item, fieldName) {
    return parseArrayLikeField(item[fieldName]);
}

function scoreItem(item, queryTokens) {
    let score = 0;
    const titleText = normalizeText(item.title);
    const descriptionText = normalizeText(item.description);
    const genresText = collectFieldTokens(item, 'genres');
    const tagsText = collectFieldTokens(item, 'tags');

    for (const token of queryTokens) {
        if (genresText.some(entry => entry.includes(token) || token.includes(entry))) {
            score += token.length >= 4 ? 6 : 4;
            continue;
        }

        if (tagsText.some(entry => entry.includes(token) || token.includes(entry))) {
            score += token.length >= 4 ? 5 : 3;
            continue;
        }

        if (descriptionText.includes(token)) {
            score += token.length >= 6 ? 3 : 2;
            continue;
        }

        if (titleText.includes(token)) {
            score += token.length >= 6 ? 2 : 1;
        }
    }

    return score;
}

function pickCandidates(items, user_prompt, limit = 5) {
    const queryTokens = tokenize(user_prompt);
    const ranked = items
        .map(item => ({
            ...item,
            _score: scoreItem(item, queryTokens)
        }))
        .sort((left, right) => right._score - left._score || (right.title || '').length - (left.title || '').length)
        .slice(0, limit)
        .map(({ _score, ...item }) => item);

    return ranked;
}

async function generateContent(user_prompt) {
    // Ensure catalogs are loaded before building the system instruction
    if ((peliculas.length === 0 || juegos.length === 0) && (urlMovies || urlGames)) {
        try {
            await inicializarCatalogo();
            logger.info('Catalogs refreshed before generating content');
        } catch (err) {
            logger.warn('Could not reload catalogs before generating content', { error: err.message || err });
        }
    }

    const movieCandidates = pickCandidates(peliculas, user_prompt, 4);
    const gameCandidates = pickCandidates(juegos, user_prompt, 6);
    const systemInstruction = buildSystemInstruction();
    const candidateContext = [
        `MOVIE_CANDIDATES: ${JSON.stringify(movieCandidates)}`,
        `GAME_CANDIDATES: ${JSON.stringify(gameCandidates)}`
    ].join('\n');

    const client = await getMistral();
    const result = await client.chat.complete({
        model: "mistral-small-latest",
        messages: [
            { role: 'system', content: systemInstruction },
            { role: 'system', content: candidateContext },
            { role: 'user', content: user_prompt }
        ]
    });
    return result.choices[0].message.content;
}

router.use(authRequired);


/**
 * @swagger
 * /ai/generate:
 *   post:
 *     summary: Generar una recomendación mediante IA
 *     description: Recibe una petición del usuario y devuelve una recomendación conversacional de película o videojuego a partir de los catálogos disponibles.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_prompt
 *             properties:
 *               user_prompt:
 *                 type: string
 *                 example: Recomiéndame un juego parecido a Blade Runner
 *     responses:
 *       200:
 *         description: Recomendación generada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                   example: Podrías probar Cyberpunk 2077 si buscas una experiencia futurista con estética oscura y narrativa intensa.
 *       400:
 *         description: Falta el campo user_prompt
 *       401:
 *         description: Token ausente o inválido
 *       429:
 *         description: Límite de peticiones alcanzado en el proveedor de IA
 *       500:
 *         description: Error al generar la recomendación
 */

router.post('/generate', async (req, res) => {
    const { user_prompt } = req.body;
    if (!user_prompt) {
        return res.status(400).json({ error: 'user_prompt is required' });
    }
    try {
        const requesterId = req.userId;
        const aiResponse = await generateContent(user_prompt);
        res.json({ response: aiResponse });
    } catch (error) {
        logger.error('Error generating content', { error: error.message, statusCode: error.statusCode, stack: error.stack });
        if (error?.statusCode === 429 || error?.body?.includes('rate_limited')) {
            return res.status(429).json({
                error: 'Rate limit exceeded while calling Mistral',
                suggestion: 'Retry in a few seconds. The request now uses a much smaller catalog context.'
            });
        }
        res.status(500).json({ error: 'Failed to generate content' });
    }
});


/**
 * @swagger
 * /ai/status:
 *   get:
 *     summary: Consultar estado de los catálogos cargados para IA
 *     description: Devuelve el número de películas y videojuegos cargados en memoria y una pequeña muestra de ambos catálogos.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estado de catálogos devuelto correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 moviesCount:
 *                   type: integer
 *                   example: 500
 *                 gamesCount:
 *                   type: integer
 *                   example: 1000
 *                 sampleMovies:
 *                   type: array
 *                   items:
 *                     type: object
 *                 sampleGames:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Token ausente o inválido
 *       500:
 *         description: Error interno del servidor
 */

router.get('/status', (req, res) => {
    res.json({
        moviesCount: peliculas.length,
        gamesCount: juegos.length,
        sampleMovies: peliculas.slice(0, 5),
        sampleGames: juegos.slice(0, 5)
    });
});

module.exports = router;