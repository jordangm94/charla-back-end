const { request, response } = require('express');
const express = require('express');
const router = express.Router();
const bcrypt = require("bcryptjs");
const { createToken, validateToken } = require("../JWT");

/////////////////////////////////
/// Index
/////////////////////////////////

module.exports = (db, actions) => {
  const { getContactByEmail, getContactByUsername, registerContact } = actions;

  router.get('/', (req, res) => {
    res.send('Hello from the CHAT APP!');
  });

  // This route is used to load the profile picture and last message received from each user in the chat list. This information also used in loading searched users (name and profile picture), which also uses the chatlistitem.
  router.get('/chat/list/message', validateToken, (req, res) => {
    //Used DISTINCT ON to remove duplicate rows of conversation_id (i.e. multiple messages belonging to convo ID) and only show 1 message for each conversation ID in the ChatList component.
    const contact = req.contact;

    db.query(
      `SELECT DISTINCT ON (participant.conversation_id) participant.conversation_id, conversation_name, message.id AS message_id, message_text

      FROM participant JOIN conversation ON participant.conversation_id = conversation.id JOIN message ON conversation.id = message.conversation_id
      
      WHERE participant.contact_id = $1
      
      ORDER BY conversation_id DESC, message.id DESC;
      `, [contact.id]
    ).then(({ rows }) => {
      res.json(rows);
    });
  });

  router.get('/chat/list/profile', validateToken, (req, res) => {
    const contact = req.contact;
    const conversationID = req.query.conversationID;

    db.query(
      `SELECT participant.contact_id

      FROM participant JOIN conversation ON conversation_id = conversation.id

      WHERE conversation_id = $1

      AND participant.contact_id != $2
      `, [conversationID, contact.id]
    ).then(({ rows }) => {
      res.json(rows[0]);
    });
  });

  //This route is used for live searching for a user within the database using the search bar
  router.get('/searchuser', (req, res) => {
    const searchUserInput = `%${req.query.searchedUser}%`;
    console.log('Hello from searchUserInput', searchUserInput);
    db.query(
      `SELECT id, first_name, last_name, profile_photo_url
    
      FROM contact
     
      WHERE LOWER(first_name) LIKE
     
      LOWER($1);
      `, [searchUserInput]
    ).then(({ rows }) => {
      return res.json(rows);
    });
  });

  //Need to add corresponding ID to the route, send in a request
  router.get('/chat', validateToken, (req, res) => {
    const conversationId = req.query.id;
    const contact = req.contact;
    db.query(`SELECT * 
      FROM message 
      WHERE conversation_id = $1;
    `, [conversationId])
      .then(({ rows }) => {
        // res.json(rows);
        res.json({ rows, id: contact.id });
      });
  });

  router.post('/register', (req, res) => {
    const { firstName, lastName, username, email, password } = req.body;

    getContactByEmail(db, email).then(contact => {
      if (contact) {
        return res.status(400).json({ error: "Email exists", message: "An account with this email already exists!" });
      }
      getContactByUsername(db, username).then(contact => {
        if (contact) {
          return res.status(400).json({ error: "Username exists", message: "This username has already been taken!" });
        } else {
          const hashedPassword = bcrypt.hashSync(password, 10);
          registerContact(db, firstName, lastName, username, email, hashedPassword).then(contact => {
            const accessToken = createToken(contact);

            req.session.accessToken = accessToken;

            return res.json({ error: null, authenticated: true });
          })
            .catch(error => {
              return res.status(400).json({ error });
            });
        }
      });
    });
  });

  router.post('/login', (req, res) => {
    const { email, password } = req.body;

    getContactByEmail(db, email).then(contact => {
      if (contact && bcrypt.compareSync(password, contact.password_hash)) {
        const accessToken = createToken(contact);

        req.session.accessToken = accessToken;

        return res.json({ error: null, authenticated: true });
      } else {
        return res.status(400).json({ error: "Incorrect email or password!" });
      }
    });

  });

  router.post("/authenticate", validateToken, (req, res) => {
    const authenticated = req.authenticated;
    return res.json({ authenticated });
  });

  router.post("/logout", validateToken, (req, res) => {
    req.session = null;
    return res.json({ error: null, auth: false });
  });

  return router;
};
