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
      `SELECT DISTINCT ON (participant.conversation_id) participant.conversation_id, conversation_name, message.id AS message_id, message_text, message.contact_id AS message_owner_id

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
      `SELECT contact.id, first_name, last_name, profile_photo_url

      FROM participant JOIN conversation ON conversation_id = conversation.id JOIN contact ON participant.contact_id = contact.id

      WHERE conversation_id = $1

      AND participant.contact_id != $2
      `, [conversationID, contact.id]
    ).then(({ rows }) => {
      res.json(rows[0]);
    });
  });

  //This route is used for live searching for a user within the database using the search bar
  router.get('/searchuser', validateToken, (req, res) => {
    const searchUserInput = `%${req.query.searchedUser}%`;
    const contact = req.contact;

    db.query(
      `SELECT id, first_name, last_name, profile_photo_url
    
      FROM contact

      WHERE id != $2
     
      AND (LOWER(first_name) LIKE LOWER($1) OR LOWER(last_name) LIKE LOWER($1) OR LOWER(user_name) LIKE LOWER($1))
      `, [searchUserInput, contact.id]
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

  //This route is used after the /newconversation post route, it takes both the logged in user id and contact ID and uses them to get the conversation with both users
  router.get('/getthenewconversation', validateToken, (req, res) => {
    const loggedInUserID = req.contact.id;
    const contactYouAreStartingAConvoWith = req.query.contactid;
    console.log('HELLO FROM SUNDAY WORK', loggedInUserID, contactYouAreStartingAConvoWith);

    db.query(`
    SELECT conversation.id AS conversation_id 
    FROM conversation 
    WHERE conversation_name = 'Conversation between user ${loggedInUserID} and ${contactYouAreStartingAConvoWith}'
    `)
      .then(({ rows }) => {
        res.json({ rows });
      });
  });

  //This route will be accessed in the chat input component, before a message is sent a get request ensures that both indivduals are participants in that conversation before allowing user input in that conversation (this is for the case where a participant has closed a convo, which removes them from that convo. Therefore whenr eopening need to add them back).
  router.get('/participantspresent', validateToken, (req, res) => {
    const loggedInUserID = req.contact.id
    const convoID = req.query.convoID;

    console.log('Hello from your contact ID and and CONVO ID in your participantspresent route', loggedInUserID, convoID)
    
    // SELECT message.contact_id AS message_contact_id_always_not_null, participant.contact_id AS participant_contact_id_sometimes_null
    // FROM participant JOIN conversation ON conversation_id = conversation.id JOIN message ON conversation.id = message.conversation_id
    // WHERE participant.conversation_id = 1  AND message.contact_id = 
    // LIMIT 2;
    
    db.query(`
    // SELECT contact_id FROM participant WHERE conversation_id = ${convoID}
    `)
    .then(({ rows }) => {
      res.json({ rows, loggedInUserID: loggedInUserID });
    })
  });

  router.post('/addparticipantbacktoconvo', validateToken, (req, res) => {
    const loggedInUserID = req.contact.id
    const convoID = req.body.convoID;

    console.log('HELLO FROM THE CONVOID in the add participant back route', convoID)

    db.query(`INSERT INTO participant (conversation_id, contact_id) VALUES (${convoID}, ${loggedInUserID} )
    `)
    .then(({ rows }) => {
      // res.json(rows);
      res.json({ rows });
    });
  });

  router.post('/messagesubmission', validateToken, (req, res) => {
    const messageSubmitted = req.body.messageSubmitted;
    const contact = req.contact.id;
    const convoID = req.body.convoID;
    console.log('Hello from the backend here is your req.body', messageSubmitted, contact, convoID);

    db.query(`INSERT INTO message (contact_id, message_text, sent_datetime, conversation_id)
    VALUES ($1, $2, NOW(), $3);
  `, [contact, messageSubmitted, convoID])
      .then(({ rows }) => {
        // res.json(rows);
        res.json({ rows });
      });
  });

  router.post('/newconversation', validateToken, (req, res) => {
    const loggedInUserID = req.contact.id; //Contains the ID of the user who is logged in
    const contactYouAreStartingAConvoWith = req.body.contactid;
    const contactFirstName = req.body.firstName;
    const contactLastName = req.body.lastName;

    db.query(`
    INSERT INTO conversation (conversation_name)
    VALUES ('Conversation between user ${loggedInUserID} and ${contactYouAreStartingAConvoWith}');

    INSERT INTO participant (conversation_id, contact_id)
    VALUES((SELECT LAST_VALUE("id") OVER (ORDER BY "id" DESC) FROM conversation LIMIT 1), ${loggedInUserID}),
    ((SELECT LAST_VALUE("id") OVER (ORDER BY "id" DESC) FROM conversation LIMIT 1), ${contactYouAreStartingAConvoWith});

    INSERT INTO message(contact_id, message_text, sent_datetime, conversation_id)
    VALUES(5, 'You have now started a conversation with ${contactFirstName} ${contactLastName}.', NOW(), (SELECT LAST_VALUE("id") OVER (ORDER BY "id" DESC) FROM conversation LIMIT 1)); 
  `)
      //Important note, upon deployment if database is adjsuted and admin user is changed, we must change the number 5 in insert query.
      .then(({ rows }) => {
        // res.json(rows);
        res.json({ rows });
      });
  });

  router.delete('/deleteparticipant', validateToken, (req, res) => {
    loggedInContactID = req.contact.id;
    convoID = req.query.convoID;
    console.log("HELLO FROM YOUR DELETE ROUTE AND YOUR CONVOID", loggedInContactID, convoID);

    db.query(`
    DELETE FROM participant
    WHERE conversation_id = ${convoID} AND contact_id = ${loggedInContactID};`)
      .then(({ rows }) => {
        res.json({ rows });
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

  router.get("/loggedin", validateToken, (req, res) => {
    const loggedInUser = req.contact;
    return res.json({ loggedInUser });
  });

  router.post('/feedback', (req, res) => {
    const { fullName, feedback } = req.body;

    db.query(`
    INSERT INTO feedback (full_name, message)
    VALUES ($1, $2); 
  `, [fullName, feedback])
      .then(({ rows }) => {
        return res.json(rows);
      })
      .catch(error => {
        return res.status(400).json({ error });
      });
  });

  router.get('/feedback', (req, res) => {
    db.query(`
    SELECT *
    FROM feedback; 
  `)
      .then(({ rows }) => {
        return res.json(rows);
      })
      .catch(error => {
        return res.status(400).json({ error });
      });
  });

  return router;
};
