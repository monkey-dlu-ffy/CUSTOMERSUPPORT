const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Adjust the path if your models folder is elsewhere

const protect = async (req, res, next) => {
  let token;
  
  // 1. Check if the request header contains a Bearer token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 2. Extract the token from the header (Format is "Bearer <token>")
      token = req.headers.authorization.split(' ')[1];

      // 3. Verify the token using your secret key from the .env file
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 4. Find the user in the database using the ID hidden inside the token
      // .select('-password') ensures we don't accidentally pass the hashed password forward
      req.user = await User.findById(decoded.userId).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user no longer exists' });
      }

      // 5. CRITICAL: If the JWT carries an organizationId (set at login-time org picker),
      //    use that instead of whatever is stored on the User document.
      //    This lets a Customer choose their active org at login without changing the DB record.
      if (decoded.organizationId) {
        req.user = req.user.toObject(); // convert Mongoose doc → plain object so we can overwrite
        req.user.organizationId = decoded.organizationId;
      }

      // 6. If everything checks out, move on to the actual controller
      next();
      
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed or expired' });
    }
  }

  // If no token was found at all
  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    // req.user was securely attached by the 'protect' middleware right before this runs
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Forbidden: Access denied for role '${req.user?.role || 'Unknown'}'` 
      });
    }
    // If their role matches the VIP list, let them through
    next();
  };
};

module.exports = { protect, authorize };