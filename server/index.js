const PORT = process.env.PORT || 8001;
const http = require('http');
const { Server } = require('socket.io');
const sharedSession = require('express-socket.io-session');
const ENV = require('./environment');

const getContactByEmail = (db, email) => {
  const queryString = `
    SELECT *
    FROM contact
    WHERE email = $1
  `;
  return db
    .query(queryString, [email])
    .then((result) => result.rows[0])
    .catch((error) => {
      console.log(error.message);
    });
};

const getContactByUsername = (db, username) => {
  const queryString = `
    SELECT *
    FROM contact
    WHERE user_name = $1
  `;
  return db
    .query(queryString, [username])
    .then((result) => result.rows[0])
    .catch((error) => {
      console.log(error.message);
    });
};

const registerContact = (
  db,
  firstName,
  lastName,
  username,
  email,
  hashedPassword,
  profilePic
) => {
  const queryString = `
    INSERT INTO contact (first_name, last_name, user_name, email, password_hash, profile_photo_url)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const params = [
    firstName,
    lastName,
    username,
    email,
    hashedPassword,
    profilePic,
  ];

  return db
    .query(queryString, params)
    .then((result) => result.rows[0])
    .catch((error) => {
      console.log(error.message);
    });
};

const app = require('./application')(ENV, {
  getContactByEmail,
  getContactByUsername,
  registerContact,
});

const server = http.Server(app);
const { sessionMiddleware } = require('./serverController');
const {
  authorizeUser,
  updateParticipantStatus,
  newConvo,
  newMessage,
  initializeUser,
  closeUser,
} = require('./socketController');

const io = new Server(server, {
  cors: {
    origin: true,
    method: ['GET', 'POST'],
    credentials: true,
  },
});

io.use(sharedSession(sessionMiddleware));
io.use(authorizeUser);

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);
  initializeUser(socket);

  socket.on('update_participant_status', (values, callback) => {
    updateParticipantStatus(socket, values, callback);
  });

  socket.on('new_convo', (otherContact, callback) => {
    newConvo(socket, otherContact, callback);
  });

  socket.on('new_message', (values, callback) => {
    newMessage(socket, values, callback);
  });

  socket.on('disconnect', () => {
    console.log(`User Disconnected ${socket.id}`);
    closeUser(socket);
  });
});

server.listen(PORT, () => {
  console.log(`Listening on port ${PORT} in ${ENV} mode.`);
});
