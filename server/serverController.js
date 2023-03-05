const cookieSession = require("cookie-session");

const cookieSessionMiddleware = cookieSession({
  name: 'session',
  keys: [process.env.SESSIONKEYONE, process.env.SESSIONKEYTWO]
});

module.exports = { cookieSessionMiddleware };