const { request, response } = require('express');
const express = require('express');
const router = express.Router();

/////////////////////////////////
/// Index
/////////////////////////////////

module.exports = db => {

  router.get('/', (req, res) => {
    res.send('Hello from the CHAT APP!');
  });

  router.get('/chat/list', (req, res) => {
    db.query(
      `SELECT conversation.id as conversation_id, conversation_name, member_1, member_2, message.id AS message_id, message_text, contact.id AS contact_id, contact.first_name, contact.last_name, contact.profile_photo_url, contact.email

      FROM conversation JOIN message ON conversation.id = conversation_id JOIN contact ON contact_id = contact.id
    
      WHERE member_1 = 1
          
      ORDER BY conversation_id ASC, message.id DESC;
      `
    ).then(({ rows }) => {
      res.json(rows);
    });
  });

  return router;
};

// //login
//   router.post('/login', (req, res) => {

//   });
//   return router;
// };
