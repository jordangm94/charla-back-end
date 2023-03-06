const session = require("express-session");
const client = require("./db/index");
const pgSession = require("connect-pg-simple")(session);

const sessionMiddleware = session({
  store: new pgSession({ client }),
  secret: process.env.SESSION_KEY,
  saveUninitialized: false,
  resave: false,
  cookie: {
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_MAX_AGE)
  }
});

module.export = { sessionMiddleware };