const auth = require('./auth');

module.exports = (req, res, next) => {
  auth(req, res, () => {
    if (req.user?.role !== 'provider') {
      return res.status(403).json({ message: 'Access denied. Provider only.' });
    }

    next();
  });
};
