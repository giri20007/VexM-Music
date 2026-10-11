const app = require('./app');

module.exports = (req, res) => {
  return app(req, res);
};

module.exports.default = app;
