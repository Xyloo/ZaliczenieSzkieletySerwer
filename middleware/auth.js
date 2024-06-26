const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    const token = req.header('Authorization');

    // Sprawdzenie, czy token istnieje
    if (!token) {
        return res.status(401).json({ error: 'Access denied. Token is missing.' });
    }

    try {
        // Weryfikacja tokenu
        const decodedToken = token.replace('Bearer ', '');
        req.user = jwt.verify(decodedToken, process.env.JWTPRIVATEKEY);
        next();
    } catch (err) {
        if(err.name === 'TokenExpiredError')
            return res.status(401).json({ error: 'Token expired.' });
        res.status(401).json({ error: 'Invalid token.' });
    }
};

module.exports = { auth };
