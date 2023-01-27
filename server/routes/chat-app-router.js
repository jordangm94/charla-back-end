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
      `SELECT conversation_id, conversation.conversation_name, message.id, message.message_text, contact.first_name, contact.last_name

      FROM conversation JOIN message ON conversation.id = conversation_id JOIN contact ON contact_id = contact.id
      
      ORDER BY conversation_id ASC, message.id DESC;`
    ).then(({ rows }) => {
      res.json(rows);
    });
  });

  router.post('/login', (req, res) => {
    const { email, password } = req.body;

    
  });

  return router;
};