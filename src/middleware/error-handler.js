const STATUS_LABELS = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'Internal Server Error'
};

function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    statusCode: 404,
    error: STATUS_LABELS[404],
    message: `Route not found: ${req.originalUrl}`
  });
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV !== 'production') {
    // Keep stack traces available in non-production for faster debugging.
    console.error(
      `[error:${req.requestId || '-'}] ${req.method} ${req.originalUrl} status=${statusCode} message=${message}`
    );
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    error: STATUS_LABELS[statusCode] || 'Error',
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
