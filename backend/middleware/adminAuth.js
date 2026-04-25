const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const authHeader = req.header('authorization');
    const token = req.header('x-auth-token') || (authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token, authorization denied'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({
      success: false,
      message: 'Token is not valid'
    });
  }
};
