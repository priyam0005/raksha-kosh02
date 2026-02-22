// middleware/optionalAuth.js

const jwt = require("jsonwebtoken");

module.exports = function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null; // anonymous — just continue
    return next();
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET_TOKEN);
    req.user = decoded; // { id, email, name }
  } catch {
    req.user = null; // invalid/expired token — treat as anonymous
  }

  next();
};
