const { sign, verify } = require("jsonwebtoken");

const createToken = (contact) => {
  const accessToken = sign(
    { id: contact.id, username: contact.username },
    process.env.JWTSECRET
  );

  return accessToken;
};

module.exports = { createToken };