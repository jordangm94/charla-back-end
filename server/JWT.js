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

  if (!accessToken) {
    return res.status(400).json({ error: "User not authenticated" });
  }

  verify(accessToken, process.env.JWTSECRET, (error, decoded) => {
    if (error) {
      return res.status(400).json({ error });
    } else {
      req.contact = decoded.contact;
      console.log(req.contact);
      return next();
    }
  });
};

module.exports = { createToken, validateToken };