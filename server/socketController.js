const jwt = require('jsonwebtoken');
const db = require('./db');

module.exports.authorizeUser = async (socket, next) => {
  if (!socket.handshake.session.accessToken) {
    console.log('Bad request!');
    next(new Error('Not authorized'));
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

module.exports.initializeUser = (socket) => {
  db.query(
    `
    INSERT INTO socket (socket_id, contact_id)
    VALUES ($1, $2);
    `,
    [socket.id, socket.user.id]
  );
};

module.exports.closeUser = (socket) => {
  db.query(
    `
  DELETE FROM socket
  WHERE contact_id = $1;
  `,
    [socket.user.id]
  );
};

module.exports.updateParticipantStatus = async (socket, values, callback) => {
  const otherContactSocketID = await db.query(
    `
  SELECT socket_id
  FROM socket JOIN contact ON socket.contact_id = contact.id JOIN participant ON participant.contact_id = socket.contact_id
  WHERE participant.conversation_id = $1
  AND participant.contact_id != $2
  `,
    [values.convoID, socket.user.id]
  );

  const updateParticipantStatusData = await db.query(
    `
  UPDATE participant
  SET participating = $1
  WHERE conversation_id = $2
  AND contact_id = $3
  RETURNING *;
  `,
    [values.amIPresent, values.convoID, socket.user.id]
  );

  if (updateParticipantStatusData) {
    callback({ done: true, data: updateParticipantStatusData.rows[0] });

    if (otherContactSocketID.rows[0]) {
      socket
        .to(otherContactSocketID.rows[0].socket_id)
        .emit('update_participant_status', updateParticipantStatusData.rows[0]);
    }
  }
};

module.exports.newConvo = async (socket, otherContact, callback) => {
  if (socket.user.id === otherContact.contactid) {
    callback({
      done: false,
      error: 'Cannot create a conversation with yourself',
    });
    return;
  }

  const otherContactSocketID = await db.query(
    `
  SELECT socket_id
  FROM socket
  WHERE contact_id = $1
  `,
    [otherContact.contactID]
  );

  const conversationInsertdata = await db.query(
    `
  INSERT INTO conversation (conversation_name)
  VALUES ('Conversation between user ' || $1 || ' and ' || $2)
  RETURNING *;
  `,
    [socket.user.id, otherContact.contactID]
  );

  const participantInsertData = await db.query(
    `
  INSERT INTO participant (conversation_id, contact_id, participating)
  VALUES((SELECT LAST_VALUE("id") OVER (ORDER BY "id" DESC) FROM conversation LIMIT 1), $1, true),
  ((SELECT LAST_VALUE("id") OVER (ORDER BY "id" DESC) FROM conversation LIMIT 1), $2, true)
  RETURNING *;
  `,
    [socket.user.id, otherContact.contactID]
  );

  const messageInsertData = await db.query(
    `
  INSERT INTO message(contact_id, message_text, sent_datetime, conversation_id)
  VALUES(5, 'A conversation has started between ' || $1 || ' ' || $2 || ' and ' || $3 || ' ' || $4, NOW(), (SELECT LAST_VALUE("id") OVER (ORDER BY "id" DESC) FROM conversation LIMIT 1))
  RETURNING *;
  `,
    [
      socket.user.firstName,
      socket.user.lastName,
      otherContact.firstName,
      otherContact.lastName,
    ]
  );

  if (conversationInsertdata && participantInsertData && messageInsertData) {
    const conversationData = conversationInsertdata.rows[0];
    const participantsData = participantInsertData.rows;
    const messageData = messageInsertData.rows[0];

    const otherParticipant = participantsData.find(
      (participant) => participant.contact_id !== socket.user.id
    );

    const otherParticipantExtraData = await db.query(
      `
    SELECT first_name, last_name, profile_photo_url
    FROM contact
    WHERE id = $1
    `,
      [otherParticipant.contact_id]
    );

    const myData = participantsData.find(
      (participant) => participant.contact_id === socket.user.id
    );

    const myExtraData = await db.query(
      `
    SELECT first_name, last_name, profile_photo_url
    FROM contact
    WHERE id = $1
    `,
      [socket.user.id]
    );

    const conversationObjectForMe = {
      conversation_id: conversationData.id,
      name: conversationData.conversation_name,
      otherParticipant: {
        id: otherParticipant.contact_id,
        firstName: otherParticipantExtraData.rows[0].first_name,
        lastName: otherParticipantExtraData.rows[0].last_name,
        profilePhotoUrl: otherParticipantExtraData.rows[0].profile_photo_url,
        participating: true,
      },
      lastMessage: {
        id: messageData.id,
        senderContactId: socket.user.id,
        messageText: messageData.message_text,
        sentDatetime: messageData.sent_datetime,
      },
      last_activity_datetime: messageData.sent_datetime,
      amIPresent: true,
    };

    const conversationObjectForOtherParticipant = {
      conversation_id: conversationData.id,
      name: conversationData.conversation_name,
      otherParticipant: {
        id: myData.contact_id,
        firstName: myExtraData.rows[0].first_name,
        lastName: myExtraData.rows[0].last_name,
        profilePhotoUrl: myExtraData.rows[0].profile_photo_url,
        participating: true,
      },
      lastMessage: {
        id: messageData.id,
        senderContactId: socket.user.id,
        messageText: messageData.message_text,
        sentDatetime: messageData.sent_datetime,
      },
      last_activity_datetime: messageData.sent_datetime,
      amIPresent: true,
    };

    callback({ done: true, data: conversationObjectForMe });

    if (otherContactSocketID.rows[0]) {
      socket
        .to(otherContactSocketID.rows[0].socket_id)
        .emit('new_convo', conversationObjectForOtherParticipant);
    }
  }
};

module.exports.newMessage = async (socket, values, callback) => {
  if (socket.user.id === values.contactID) {
    callback({ done: false, error: 'Cannot send a message to yourself' });
    return;
  }

  const otherContactSocketID = await db.query(
    `
  SELECT socket_id
  FROM socket
  WHERE contact_id = $1
  `,
    [values.contactID]
  );

  if (!values.participating) {
    db.query(
      `
    UPDATE participant
    SET participating = TRUE
    WHERE conversation_id = $1
    AND contact_id = $2;
    `,
      [values.convoID, values.contactID]
    );
  }

  const newMessageInsertData = await db.query(
    `
  INSERT INTO message(contact_id, message_text, sent_datetime, conversation_id)
  VALUES($1, $2, NOW(), $3)
  RETURNING *;
  `,
    [socket.user.id, values.messageText, values.convoID]
  );

  if (newMessageInsertData) {
    callback({ done: true, data: newMessageInsertData.rows[0] });

    if (otherContactSocketID.rows[0]) {
      socket
        .to(otherContactSocketID.rows[0].socket_id)
        .emit('new_message', newMessageInsertData.rows[0]);
    }
  }
};
