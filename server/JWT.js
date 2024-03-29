const { sign, verify } = require('jsonwebtoken');

const createToken = (contact) => {
  const accessToken = sign(
    {
      id: contact.id,
      firstName: contact.first_name,
      lastName: contact.last_name,
      profilePhotoURL: contact.profile_photo_url,
    },
    process.env.JWT_SECRET
  );

  return accessToken;
};

const validateToken = (req, res, next) => {
  const { accessToken } = req.session;

  if (!accessToken) {
    return res.status(400).json({ error: 'User not authenticated' });
  }

  verify(accessToken, process.env.JWT_SECRET, (error, decoded) => {
    if (error) {
      return res.status(400).json({ error });
    }
    req.authenticated = true;
    req.contact = {
      id: decoded.id,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      profilePhotoURL: decoded.profilePhotoURL,
    };
    return next();
  });
};

module.exports = { createToken, validateToken };
