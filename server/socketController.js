const jwt = require("jsonwebtoken");
const db = require("./db");

module.exports.authorizeUser = async (socket, next) => {
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

module.exports.initializeUser = socket => {
  db.query(`
    INSERT INTO socket (socket_id, contact_id)
    VALUES ($1, $2);
    `, [socket.id, socket.user.id]);
};

module.exports.closeUser = socket => {
  db.query(`
  DELETE FROM socket
  WHERE contact_id = $1;
  `, [socket.user.id]);
};

module.exports.newConvo = async (socket, otherContact, callback) => {
  if (socket.user.id === otherContact.contactid) {
    callback({ done: false, error: "Cannot create a conversation with yourself" });
    return;
  }

  const otherContactSocketId = await db.query(`
  SELECT socket_id
  FROM socket
  WHERE contact_id = $1
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

    const chatListData = await db.query(
      `SELECT message.conversation_id, message.id AS message_id, message_text, message.contact_id AS message_owner_id

      FROM message

      WHERE message.conversation_id = $1

      ORDER BY message.id DESC

      LIMIT 1;
      `, [data[0].rows[0].id]);

    const otherProfile = await db.query(
      `SELECT conversation_name

      FROM conversation

      WHERE conversation.id = $1

      LIMIT 1
      `, [data[0].rows[0].id]
    ).then(({ rows }) => {
      if (rows[0] && rows[0].conversation_name) {
        const otherUserID = rows[0].conversation_name.slice(26, 27) !== `${socket.user.id}` ? (+rows[0].conversation_name.slice(26, 27)) : (+rows[0].conversation_name.slice(32, 33));

        db.query(
          `SELECT contact.id, first_name, last_name, profile_photo_url
  
          FROM contact
  
          WHERE contact.id = $1
          `, [otherUserID]
        );
      }
    });

    chatListData.contact = otherProfile;

    if (otherContactSocketId.rows[0]) {
      console.log(otherContactSocketId.rows[0].socket_id);
      socket.to(otherContactSocketId.rows[0].socket_id).emit('new_convo', chatListData);
    }

    return;
  }
};

module.exports.newMessage = async (socket, otherContact, callback) => {
  if (socket.user.id === otherContact.contactid) {
    callback({ done: false, error: "Cannot send a message to yourself" });
    return;
  }

  const otherContactSocketId = await db.query(`
  SELECT socket_id
  FROM socket
  WHERE contact_id = $1
  `, [otherContact.contactid]);

  
};