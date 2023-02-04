const { request, response } = require('express');
const express = require('express');
const router = express.Router();
const bcrypt = require("bcryptjs");

/////////////////////////////////
/// Index
/////////////////////////////////

module.exports = (db, actions) => {
  const { getContactByEmail, getContactByUsername, registerContact } = actions;

  router.get('/', (req, res) => {
    res.send('Hello from the CHAT APP!');
  });

  router.get('/chat/list', (req, res) => {
    //Used DISTINCT ON to remove duplicate rows of conversation_id (i.e. multiple messages belonging to convo ID) and only show 1 message for each conversation ID in the ChatList component.
    db.query(
      `SELECT DISTINCT ON (conversation.id) conversation_id, conversation_name, member_1, member_2, message.id AS message_id, message_text, contact.id AS contact_id, contact.first_name, contact.last_name, contact.profile_photo_url, contact.email

      FROM conversation JOIN message ON conversation.id = conversation_id JOIN contact ON contact_id = contact.id
      
      WHERE member_1 = 1 OR member_2 = 1
      
      ORDER BY conversation.id DESC, message.id DESC;
      `
    ).then(({ rows }) => {
      res.json(rows);
    });
  });

  router.get('/searchuser', (req, res) => {
    searchUserInput = req.query.searchedUser
    console.log(searchUserInput)
    db.query(
      `SELECT contact.id, contact.first_name, contact.last_name

      FROM contact
      
      ORDER BY contact.first_name ASC;
      `
    ).then(({ rows }) => {
      res.json(rows);
    });
  });

  router.post('/register', (req, res) => {
    const { firstName, lastName, username, email, password } = req.body;

    getContactByEmail(db, email).then(contact => {
      if (contact) {
        return res.json({ error: "Email exists", message: "An account with this email already exists!" });
      }
      getContactByUsername(db, username).then(contact => {
        if (contact) {
          return res.json({ error: "Username exists", message: "This username has already been taken!" });
        } else {
          const hashedPassword = bcrypt.hashSync(password, 10);
          registerContact(db, firstName, lastName, username, email, hashedPassword).then(contact => {
            return res.json({ error: null, message: "Success", contact });
          })
            .catch(error => {
              console.log(error.message);
            });
        }
      });
    });
  });

  router.post('/login', (req, res) => {
    const { email, password } = req.body;

    getContactByEmail(db, email).then(contact => {
      if (!contact || !bcrypt.compareSync(password, contact.password_hash)) {
        return res.json({ error: "Failed login", message: "Incorrect email or password!" });
      } else {
        return res.json({ error: null, message: "Success", contact });
      }
    });

  });


  return router;
};
