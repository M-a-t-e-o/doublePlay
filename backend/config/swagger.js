const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'DoublePlay API',
            version: '1.0.0',
            description: 'API documentation for DoublePlay'
        }
    },
    servers: [
        { url: 'http://localhost:{port}/api', description: 'Local dev server',
          variables: { port : { default: process.env.PORT || '3000' } } }
    ],
    apis: ['./routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;