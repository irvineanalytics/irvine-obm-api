const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { randomUUID } = require('crypto');
const swaggerUi = require('swagger-ui-express');

const env = require('./config/env');
const apiRoutes = require('./routes');
const swaggerSpec = require('./docs/swagger');
const { notFoundHandler, errorHandler } = require('./middleware/error-handler');

const app = express();

morgan.token('req-id', (req) => req.requestId || '-');
morgan.token('query', (req) => JSON.stringify(req.query || {}));

app.use(helmet());
app.use(cors());
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
});

morgan.token('safe-path', req => req.path);
app.use(morgan(':method :safe-path :status :response-time ms'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Irvine OBM API is running'
  });
});

app.get('/api-docs.json', (req, res) => {
  res.status(200).json(swaggerSpec);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(env.apiPrefix, apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
