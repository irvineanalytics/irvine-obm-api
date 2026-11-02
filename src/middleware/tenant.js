const { timingSafeEqual } = require('node:crypto');
const { withCompany, validId } = require('@irvine/tenant-runtime');
module.exports = (req, res, next) => {
  const expected = Buffer.from(process.env.INTERNAL_SERVICE_KEY || '');
  const supplied = Buffer.from(req.headers['x-service-key'] || '');
  const company = req.headers['x-company-id'];
  if (expected.length < 32 || expected.length !== supplied.length || !timingSafeEqual(expected, supplied) || !validId(company)) return res.sendStatus(401);
  req.tenant = { company_id: Number(company), internal: true };
  return withCompany(Number(company), next);
};
