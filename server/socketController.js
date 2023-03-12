const jwt = require("jsonwebtoken");

module.exports.authorizeUser = (socket, next) => {
  if (!socket.handshake.session.accessToken) {
    console.log("Bad request!");
    next(new Error("Not authorized"));
  } else {
    const token = socket.handshake.session.accessToken;

    jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
      if (error) {
        return next(new Error('Unauthorized'));
      }
      socket.decoded = decoded;
    });

    socket.user = { ...socket.decoded };
    next();
  }
};

module.exports.newConvo = (otherContact, callback) => {
  console.log(otherContact);
  callback({ done: true });
};