const { sign, verify } = require("jsonwebtoken");

const createToken = (contact) => {
  const accessToken = sign(
    { id: contact.id, username: contact.username },
    process.env.JWTSECRET
  );

  return accessToken;
};

const validateToken = (req, res, next) => {
  const accessToken = req.session.accessToken;

  if (!accessToken) return res.status(400).json({ error: "User not authenticated" });

  try {
    const validToken = verify(accessToken, process.env.JWTSECRET);

    if (validToken) {
      req.authenticated = true;
      return next();
    }
  } catch (error) {
    return res.status(400).json({ error });
  }
};

module.exports = { createToken, validateToken };