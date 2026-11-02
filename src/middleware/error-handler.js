function notFoundHandler(_req, res) { res.status(404).json({ message: 'Not found' }); }
function errorHandler(error, req, res, _next) {
  const status = [400, 401, 403, 404].includes(error.statusCode) ? error.statusCode : 503;
  console.error(JSON.stringify({ event: 'obm-request-failed', company_id: req.tenant?.company_id, status }));
  res.status(status).json({ message: status === 404 ? 'Site unavailable' : 'Tenant service unavailable' });
}
module.exports = { notFoundHandler, errorHandler };
