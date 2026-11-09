let instance;
module.exports = () => {
  if (!instance) instance = require('@irvine/tenant-runtime').createRuntime(require('../config/database').pool);
  return instance;
};
