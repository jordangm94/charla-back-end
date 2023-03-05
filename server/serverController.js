const cookieSession = require("cookie-session");

const cookieSessionMiddleware = cookieSession({
  name: 'session',
  keys: [process.env.SESSIONKEYONE, process.env.SESSIONKEYTWO]
});

const wrap = expressMiddleware => (socket, next) => expressMiddleware(socket.request, {}, next);

module.exports = { cookieSessionMiddleware, wrap };