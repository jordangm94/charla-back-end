const PORT = process.env.PORT || 8001;
const ENV = require("./environment");

const app = require("./application")(ENV, { getContactByEmail, getContactByUsername, registerContact });
const { Server } = require("socket.io");

const server = require("http").Server(app);
const { verify } = require("jsonwebtoken");

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    method: ["GET", "POST"]
  }
});

function getContactByEmail(db, email) {
  const queryString = `
    SELECT *
    FROM contact
    WHERE email = $1
  `;
  return db.query(queryString, [email])
    .then(result => {
      return result.rows[0];
    })
    .catch(error => {
      console.log(error.message);
    });
};

function getContactByUsername(db, username) {
  const queryString = `
    SELECT *
    FROM contact
    WHERE user_name = $1
  `;
  return db.query(queryString, [username])
    .then(result => {
      return result.rows[0];
    })
    .catch(error => {
      console.log(error.message);
    });
};

function registerContact(db, firstName, lastName, username, email, hashedPassword, profilePic) {
  const queryString = `
    INSERT INTO contact (first_name, last_name, user_name, email, password_hash, profile_photo_url)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const params = [firstName, lastName, username, email, hashedPassword, profilePic];

  return db.query(queryString, params)
    .then(result => {
      return result.rows[0];
    })
    .catch(error => {
      console.log(error.message);
    });
};

// io.use((socket, next) => {
//   const req = socket.handshake;

//   const cookies = cookieParser.parse(req.headers.cookie);

//   const session = cookieSession({
//     keys: [process.env.SESSIONKEYONE, process.env.SESSIONKEYTWO],
//     name: 'session'
//   })(req, {}, () => { });

//   socket.session = session;

//   next();
// });

// io.use((socket, next) => {
//   const token = socket.token;
//   if (token) {
//     verify(token, process.env.JWTSECRET, (err, decoded) => {
//       if (err) {
//         return next(new Error('JWT validation error'));
//       }

//       socket.user = decoded;
//       next();
//     });
//   } else {
//     next(new Error('Authentication error'));
//   }
// });

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);
  console.log('Session ID:', socket.session);

  socket.on("disconnect", () => {
    console.log(`User Disconnected ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Listening on port ${PORT} in ${ENV} mode.`);
});