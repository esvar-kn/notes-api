const jwt = require('jsonwebtoken');
const user = require('../models/user');
const AppError = require('../utils/appError');

// Middleware to protect routes by verifying JWT token
// All failures are forwarded to the central error handler via next(err)
const protect = async (req, res, next) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return next(new AppError('Not authorized, no token.', 401));
    }

    try {
        // Get token from header
        const token = req.headers.authorization.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from the token payload and attach to request object
        req.user = await user.findById(decoded.id);
        if (!req.user) {
            return next(new AppError('Not authorized, user not found.', 401));
        }

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return next(new AppError('Not authorized, token failed.', 401));
        }
        next(error); // Unexpected errors (e.g. DB down) keep their own status/message
    }
};

module.exports = { protect };