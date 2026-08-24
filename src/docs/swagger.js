const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Irvine OBM API',
      version: '1.0.0',
      description: 'REST API scaffold based on OB meter portal manual excerpts.'
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development server'
      }
    ],
    components: {
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            statusCode: { type: 'integer', example: 400 },
            error: { type: 'string', example: 'Bad Request' },
            message: { type: 'string', example: 'site is required' }
          }
        }
      }
    },
    paths: {
      '/': {
        get: {
          summary: 'API status',
          tags: ['System'],
          responses: {
            200: {
              description: 'API is running'
            }
          }
        }
      },
      '/api/v1/readings/request-token': {
        get: {
          summary: 'Force refresh upstream access token',
          tags: ['Authentication'],
          responses: {
            200: {
              description: 'Token refreshed',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string', example: 'Upstream token refreshed' },
                      'access-token': {
                        type: 'string',
                        example: 'S6uaZwdqkuOMUdmnFgmsM6YhIXOAOD-T_1732707189'
                      },
                      loadedAt: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            },
            502: {
              description: 'Failed to refresh token from upstream',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            }
          }
        }
      },
      '/api/v1/readings/list': {
        get: {
          summary: 'List modem and meter info',
          tags: ['Meter Operations'],
          responses: {
            200: { description: 'Meter list returned' },
            502: {
              description: 'Upstream error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            }
          }
        }
      },
      '/api/v1/readings/get-all-accounts-by-group': {
        get: {
          summary: 'List all accounts by group',
          tags: ['Account Operations'],
          responses: {
            200: { description: 'Accounts returned' },
            502: {
              description: 'Upstream error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            }
          }
        }
      },
      '/api/v1/readings/get-accounts-by-sub-group': {
        get: {
          summary: 'List accounts by subgroup',
          tags: ['Account Operations'],
          parameters: [
            {
              name: 'subgroup',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              example: 'Subgroup 1'
            }
          ],
          responses: {
            200: { description: 'Accounts for subgroup returned' },
            400: {
              description: 'Missing subgroup',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            },
            502: {
              description: 'Upstream error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            }
          }
        }
      },
      '/api/v1/readings/get-site-readings': {
        get: {
          summary: 'Get half hourly meter readings by site',
          tags: ['Reading Operations'],
          parameters: [
            {
              name: 'site',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              example: 'Heywood'
            },
            {
              name: 'date',
              in: 'query',
              required: false,
              schema: { type: 'string', format: 'date' },
              description: 'YYYY-MM-DD. Defaults to yesterday when omitted.'
            }
          ],
          responses: {
            200: { description: 'Readings returned' },
            400: {
              description: 'Invalid request parameters',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            },
            502: {
              description: 'Upstream error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            }
          }
        }
      },
      '/api/v1/readings/get-site-daily': {
        get: {
          summary: 'Get daily meter readings by site',
          tags: ['Reading Operations'],
          parameters: [
            {
              name: 'site',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              example: 'Heywood'
            },
            {
              name: 'date',
              in: 'query',
              required: false,
              schema: { type: 'string', format: 'date' },
              description: 'YYYY-MM-DD. Defaults to yesterday when omitted.'
            }
          ],
          responses: {
            200: { description: 'Daily readings returned' },
            400: {
              description: 'Invalid request parameters',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            },
            502: {
              description: 'Upstream error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            }
          }
        }
      },
      '/api/v1/health': {
        get: {
          summary: 'Health check',
          tags: ['System'],
          responses: {
            200: { description: 'Healthy status returned' }
          }
        }
      }
    }
  },
  apis: []
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
