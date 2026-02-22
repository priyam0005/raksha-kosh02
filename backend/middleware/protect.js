// middleware/protect.js

const jwt = require("jsonwebtoken");

module.exports = function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ message: "Not authorized, no token" });

  try {
    const token = authHeader.split(" ")[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET_TOKEN);
    next();
  } catch {
    return res.status(401).json({ message: "Token invalid or expired" });
  }
};
