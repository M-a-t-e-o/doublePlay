/**
 * config/swagger.js
 *
 * Configuración de Swagger/OpenAPI para documentar la API REST de doublePlay.
 * Define la información general de la API, los servidores disponibles,
 * los esquemas reutilizables, el esquema de autenticación JWT y los ficheros
 * de rutas desde los que se extraen las anotaciones JSDoc.
 */
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DoublePlay API',
      version: '1.0.0',
      description: 'API REST del backend de DoublePlay'
    },
    servers: [
      {
        url: 'http://localhost:{port}/api',
        description: 'Servidor local de desarrollo',
        variables: {
          port: {
            default: process.env.PORT || '3000'
          }
        }
      },
      {
        url: 'https://doubleplay-backend.onrender.com/api',
        description: 'Servidor de producción en Render'
      }
    ],
    tags: [
      { name: 'Auth', description: 'Autenticación y gestión de cuenta' },
      { name: 'Movies', description: 'Catálogo, reseñas e interacciones de películas' },
      { name: 'Games', description: 'Catálogo, reseñas e interacciones de videojuegos' },
      { name: 'Friends', description: 'Gestión de amistades y solicitudes' },
      { name: 'Social', description: 'Feed social de actividad de amigos' },
      { name: 'Profile', description: 'Perfil y estadísticas personales del usuario' },
      { name: 'AI', description: 'Recomendaciones mediante IA' },
      { name: 'Admin', description: 'Operaciones de administración' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Introduce el token JWT obtenido en /auth/login'
        }
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Server error'
            },
            error: {
              type: 'string',
              example: 'Failed to generate content'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 125 },
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            totalPages: { type: 'integer', example: 7 },
            hasNext: { type: 'boolean', example: true },
            hasPrev: { type: 'boolean', example: false }
          }
        },
        Rating: {
          type: 'object',
          properties: {
            avg: { type: 'number', example: 4.25 },
            count: { type: 'integer', example: 32 }
          }
        },
        Movie: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '60d5ecb54f421b2d1c8e4e1a' },
            tmdbId: { type: 'integer', example: 603 },
            title: { type: 'string', example: 'Matrix' },
            originalTitle: { type: 'string', example: 'The Matrix' },
            description: { type: 'string', example: 'Un hacker descubre la verdadera naturaleza de su realidad.' },
            releaseDate: { type: 'string', format: 'date-time' },
            posterUrl: { type: 'string', nullable: true, example: 'https://image.tmdb.org/t/p/w500/example.jpg' },
            trailerYoutubeId: { type: 'string', nullable: true, example: 'vKQi3bBA1y8' },
            genres: {
              type: 'array',
              items: { type: 'string' },
              example: ['Acción', 'Ciencia ficción']
            },
            language: { type: 'string', example: 'en' },
            runtime: { type: 'integer', example: 136 },
            isAdult: { type: 'boolean', example: false },
            rating: { $ref: '#/components/schemas/Rating' },
            numberReviews: { type: 'integer', example: 10 },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Game: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '60d5ecb54f421b2d1c8e4e1b' },
            steamAppId: { type: 'string', example: '292030' },
            title: { type: 'string', example: 'The Witcher 3: Wild Hunt' },
            description: { type: 'string', example: 'RPG de mundo abierto centrado en narrativa y exploración.' },
            genres: {
              type: 'array',
              items: { type: 'string' },
              example: ['RPG', 'Adventure']
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              example: ['Open World', 'Story Rich']
            },
            releaseDate: { type: 'string', format: 'date-time', nullable: true },
            coverUrl: { type: 'string', nullable: true },
            price: { type: 'number', example: 39.99 },
            platforms: {
              type: 'object',
              properties: {
                windows: { type: 'boolean', example: true },
                mac: { type: 'boolean', example: false },
                linux: { type: 'boolean', example: false }
              }
            },
            developers: {
              type: 'array',
              items: { type: 'string' },
              example: ['CD PROJEKT RED']
            },
            rating: { $ref: '#/components/schemas/Rating' },
            numberReviews: { type: 'integer', example: 15 },
            importedAt: { type: 'string', format: 'date-time' }
          }
        },
        Review: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '60d5ecb54f421b2d1c8e4e1c' },
            user: {
              oneOf: [
                { type: 'string' },
                { $ref: '#/components/schemas/PublicUser' }
              ]
            },
            content: { type: 'string', example: 'Muy recomendable.' },
            rating: { type: 'integer', nullable: true, minimum: 1, maximum: 5, example: 5 },
            answerTo: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        ReviewWithReplies: {
          allOf: [
            { $ref: '#/components/schemas/Review' },
            {
              type: 'object',
              properties: {
                replies: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Review' }
                }
              }
            }
          ]
        },
        InteractionState: {
          type: 'object',
          properties: {
            watched: { type: 'boolean', example: true },
            inWishlist: { type: 'boolean', example: false },
            rating: { type: 'integer', nullable: true, example: 4 },
            reviewContent: { type: 'string', nullable: true, example: 'Buena experiencia.' }
          }
        },
        PublicUser: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '60d5ecb54f421b2d1c8e4e1a' },
            id: { type: 'string', example: '60d5ecb54f421b2d1c8e4e1a' },
            name: { type: 'string', example: 'Juan Pérez' },
            username: { type: 'string', example: 'juanp88' },
            hasProfilePicture: { type: 'boolean', example: true }
          }
        },
        Friendship: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '60d5ecb54f421b2d1c8e4e1d' },
            sender: {
              oneOf: [
                { type: 'string' },
                { $ref: '#/components/schemas/PublicUser' }
              ]
            },
            receiver: {
              oneOf: [
                { type: 'string' },
                { $ref: '#/components/schemas/PublicUser' }
              ]
            },
            status: { type: 'string', enum: ['pending', 'accepted'], example: 'pending' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        ContentListItem: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '60d5ecb54f421b2d1c8e4e1b' },
            title: { type: 'string', example: 'Matrix' },
            cover: { type: 'string', nullable: true },
            genres: {
              type: 'array',
              items: { type: 'string' },
              example: ['Acción', 'Ciencia ficción']
            },
            avgRating: { type: 'number', nullable: true, example: 4.3 },
            interactedAt: { type: 'string', format: 'date-time' }
          }
        },
        SocialEvent: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['watched', 'wishlisted', 'reviewed'], example: 'reviewed' },
            date: { type: 'string', format: 'date-time' },
            user: { $ref: '#/components/schemas/PublicUser' },
            content: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                type: { type: 'string', enum: ['movie', 'game'] },
                title: { type: 'string' },
                cover: { type: 'string', nullable: true },
                genres: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            },
            rating: { type: 'integer', nullable: true, example: 5 },
            reviewContent: { type: 'string', nullable: true, example: 'Muy buena.' }
          }
        },
        AdminStats: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: 'platform' },
            computedAt: { type: 'string', format: 'date-time' },
            users: { type: 'object' },
            content: { type: 'object' },
            ratings: { type: 'object' },
            views: { type: 'object' },
            genres: { type: 'object' },
            topContent: {
              type: 'array',
              items: { type: 'object' }
            }
          }
        }
      }
    }
  },
  apis: ['./routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
