module.exports.authorizeUser = (socket, next) => {
  if (!socket.handshake.session || socket.handshake.session.accessToken) {
    console.log("Bad request!");
    next(new Error("Not authorized"));
  } else {
    next();
  }
};