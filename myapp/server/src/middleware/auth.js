const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_key_123');
    req.user = decoded; // Contains: id, email, role, department_id
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: Insufficient permissions' });
    }
    next();
  };
};

/**
 * Ensure the request operates only within the user's department.
 * Principal is exempt from department scope.
 */
const departmentScope = (req, res, next) => {
  if (req.user.role === 'PRINCIPAL') return next();
  
  // Inject department filter into query
  req.departmentId = req.user.department_id;
  next();
};

module.exports = { authMiddleware, checkRole, departmentScope };
