const jwt = require("jsonwebtoken");
const db = require("./db");

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

module.exports.newConvo = async (socket, otherContact, callback) => {
  if (socket.user.id === otherContact.contactid) {
    callback({ done: false, error: "Cannot create a conversation with yourself" });
    return;
  }

  const otherContactSocketId = await db.query(`
  SELECT user_id_socket
  FROM contact
  WHERE id = $1
  `, [otherContact.contactid]);

  const data = await db.query(`
  INSERT INTO conversation (conversation_name)
  VALUES ('Conversation between user ${socket.user.id} and ${otherContact.contactid}')
  RETURNING *;

  INSERT INTO participant (conversation_id, contact_id)
  VALUES((SELECT LAST_VALUE("id") OVER (ORDER BY "id" DESC) FROM conversation LIMIT 1), ${socket.user.id}),
  ((SELECT LAST_VALUE("id") OVER (ORDER BY "id" DESC) FROM conversation LIMIT 1), ${otherContact.contactid});

  INSERT INTO message(contact_id, message_text, sent_datetime, conversation_id)
  VALUES(5, 'A conversation has started between ${socket.user.firstName} ${socket.user.lastName} and ${otherContact.firstName} ${otherContact.lastName}.', NOW(), (SELECT LAST_VALUE("id") OVER (ORDER BY "id" DESC) FROM conversation LIMIT 1)); 
  `);

  if (data) {
    callback({ done: true, data: data[0].rows[0] });
    return;
  }
};