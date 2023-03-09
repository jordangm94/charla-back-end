const { sign, verify } = require("jsonwebtoken");

const createToken = (contact) => {
  const accessToken = sign(
    { id: contact.id, email: contact.email, username: contact.user_name, firstName: contact.first_name, lastName: contact.last_name, userIDSocket: contact.user_id_socket },
    process.env.JWT_SECRET
  );

  return accessToken;
};

const validateToken = (req, res, next) => {
  const accessToken = req.session.accessToken;

  if (!accessToken) {
    return res.status(400).json({ error: "User not authenticated" });
  }

  verify(accessToken, process.env.JWT_SECRET, (error, decoded) => {
    if (error) {
      return res.status(400).json({ error });
    } else {
      req.authenticated = true;
      req.contact = { id: decoded.id, email: decoded.email, username: decoded.username, firstName: decoded.firstName, lastName: decoded.lastName };
      return next();
    }
  });
};

module.exports = { createToken, validateToken };