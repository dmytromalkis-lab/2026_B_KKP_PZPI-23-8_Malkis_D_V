const { verifyToken } = require('../utils/jwt');

const authenticate = (req, res, next) => {
    const authHeader = req.header('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid token.' });
    }

    req.userId = decoded.userId;
    next();
};

module.exports = authenticate;