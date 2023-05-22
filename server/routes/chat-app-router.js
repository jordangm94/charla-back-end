/* eslint-disable camelcase */
const express = require('express');

const router = express.Router();
const bcrypt = require('bcryptjs');
const { createToken, validateToken } = require('../JWT');

/// //////////////////////////////
/// Index
/// //////////////////////////////

module.exports = (db, actions) => {
  const { getContactByEmail, getContactByUsername, registerContact } = actions;

  router.get('/', (req, res) => {
    res.send('Hello from the CHAT APP!');
  });

  router.post('/register', (req, res) => {
    const { firstName, lastName, username, email, password } = req.body;

    getContactByEmail(db, email).then((contact) => {
      if (contact) {
        return res.status(400).json({
          error: 'Email exists',
          message: 'An account with this email already exists!',
        });
      }
      getContactByUsername(db, username).then(() => {
        if (contact) {
          return res.status(400).json({
            error: 'Username exists',
            message: 'This username has already been taken!',
          });
        }
        const hashedPassword = bcrypt.hashSync(password, 10);
        registerContact(
          db,
          firstName,
          lastName,
          username,
          email,
          hashedPassword,
          'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png',
          'hello'
        )
          .then(() => {
            const accessToken = createToken(contact);

            req.session.accessToken = accessToken;

            const loggedInUser = {
              id: contact.id,
              firstName: contact.first_name,
              lastName: contact.last_name,
              profilePhotoURL: contact.profile_photo_url,
            };

            return res.json({
              error: null,
              authenticated: true,
              loggedInUser,
            });
          })
          .catch((error) => res.status(400).json({ error }));
      });
    });
  });

  router.post('/login', (req, res) => {
    const { email, password } = req.body;

    getContactByEmail(db, email).then((contact) => {
      if (contact && bcrypt.compareSync(password, contact.password_hash)) {
        const accessToken = createToken(contact);

        req.session.accessToken = accessToken;

        const loggedInUser = {
          id: contact.id,
          firstName: contact.first_name,
          lastName: contact.last_name,
          profilePhotoURL: contact.profile_photo_url,
        };

        return res.json({ error: null, authenticated: true, loggedInUser });
      }
      return res.status(400).json({ error: 'Incorrect email or password!' });
    });
  });

  router.post('/authenticate', validateToken, (req, res) => {
    const { authenticated } = req;
    const { contact } = req;
    return res.json({ authenticated, contact });
  });

  router.post('/logout', validateToken, (req, res) => {
    req.session.destroy();
    return res.json({ error: null, auth: false });
  });

  router.get('/conversations', validateToken, (req, res) => {
    const loggedInUser = req.contact;
    db.query(
      `
    SELECT 
    conversation.id AS conversation_id, 
    conversation.conversation_name AS name, 
    contact.id AS other_participant_id, 
    contact.first_name AS other_participant_first_name, 
    contact.last_name AS other_participant_last_name,
    contact.profile_photo_url AS other_participant_profile_photo_url, 
    message.id AS message_id, 
    message.contact_id AS sender_contact_id, 
    message.message_text AS message_text, 
    message.sent_datetime AS sent_datetime,
    MAX(message.sent_datetime) OVER (PARTITION BY conversation.id) AS last_activity_datetime,
    participant.participating AS other_participant_participating,
    (SELECT participating 
    FROM participant 
    WHERE conversation_id = conversation.id AND contact_id = $1) AS am_i_present
    FROM conversation 
    INNER JOIN participant ON conversation.id = participant.conversation_id 
    INNER JOIN contact ON participant.contact_id = contact.id 
    LEFT JOIN (
    SELECT *
    FROM message
    WHERE message.id IN (
    SELECT MAX(id)
    FROM message
    GROUP BY conversation_id
    )
    ) AS message ON conversation.id = message.conversation_id
    WHERE conversation.id IN (
    SELECT conversation_id
    FROM participant
    WHERE contact_id = $1
    )
    AND contact.id != $1
    GROUP BY conversation.id, conversation.conversation_name, contact.id, contact.first_name, contact.last_name, contact.profile_photo_url, message.id, message.contact_id, message.message_text, message.sent_datetime, participant.participating
    ORDER BY last_activity_datetime DESC, message.id ASC;  
  `,
      [loggedInUser.id]
    ).then(({ rows }) => {
      const conversations = [];
      let currentConversationId;
      let currentConversation;

      rows.forEach((row) => {
        const { conversation_id, name, last_activity_datetime, am_i_present } =
          row;

        // If the current row belongs to a new conversation, create a new conversation object
        if (conversation_id !== currentConversationId) {
          currentConversation = {
            conversation_id,
            name,
            otherParticipant: {
              id: row.other_participant_id,
              firstName: row.other_participant_first_name,
              lastName: row.other_participant_last_name,
              profilePhotoUrl: row.other_participant_profile_photo_url,
              participating: row.other_participant_participating,
            },
            lastMessage: {
              id: row.message_id,
              senderContactId: row.sender_contact_id,
              messageText: row.message_text,
              sentDatetime: row.sent_datetime,
            },
            last_activity_datetime,
            amIPresent: am_i_present,
          };
          conversations.push(currentConversation);
          currentConversationId = conversation_id;
        }
      });
      res.json(conversations);
    });
  });

  router.get('/messages', validateToken, (req, res) => {
    const conversationID = req.query.id;

    db.query(
      `
    SELECT *
    FROM message
    WHERE conversation_id = $1; 
  `,
      [conversationID]
    )
      .then(({ rows }) => res.json(rows))
      .catch((error) => res.status(400).json({ error }));
  });

  // This route is used for live searching for a user within the database using the search bar
  router.get('/searchuser', validateToken, (req, res) => {
    const searchUserInput = `%${req.query.searchValue}%`;
    const { contact } = req;

    db.query(
      `SELECT id, first_name, last_name, profile_photo_url
    
      FROM contact

      WHERE id != $2
     
      AND (LOWER(first_name) LIKE LOWER($1) OR LOWER(last_name) LIKE LOWER($1) OR LOWER(user_name) LIKE LOWER($1))
      `,
      [searchUserInput, contact.id]
    ).then(({ rows }) => res.json(rows));
  });

  router.post('/feedback', (req, res) => {
    const { fullName, feedback } = req.body;

    db.query(
      `
    INSERT INTO feedback (full_name, message)
    VALUES ($1, $2); 
  `,
      [fullName, feedback]
    )
      .then(({ rows }) => res.json(rows))
      .catch((error) => res.status(400).json({ error }));
  });

  router.get('/feedback', (req, res) => {
    db.query(
      `
    SELECT *
    FROM feedback; 
  `
    )
      .then(({ rows }) => res.json(rows))
      .catch((error) => res.status(400).json({ error }));
  });

  return router;
};
