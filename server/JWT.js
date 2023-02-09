const { sign, verify } = require("jsonwebtoken");

const createToken = (contact) => {
  const accessToken = sign(
    { id: contact.id, email: contact.email, username: contact.user_name },
    process.env.JWTSECRET
  );

  return accessToken;
};

const validateToken = (req, res, next) => {
  const accessToken = req.session.accessToken;

  if (!accessToken) {
    return res.status(400).json({ error: "User not authenticated" });
  }

  verify(accessToken, process.env.JWTSECRET, (error, decoded) => {
    if (error) {
      return res.status(400).json({ error });
    } else {
      req.authenticated = true;
      req.contact = { id: decoded.id, email: decoded.email, username: decoded.username };
      return next();
    }
  });
};

module.exports = { createToken, validateToken };