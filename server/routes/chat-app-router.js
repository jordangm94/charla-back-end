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
      `SELECT conversation_name

      FROM conversation

      WHERE conversation.id = $1

      LIMIT 1
      `, [conversationID]
    ).then(({ rows }) => {
      if (rows[0] && rows[0].conversation_name) {
        const otherUserID = rows[0].conversation_name.slice(26, 27) !== `${contact.id}` ? (+rows[0].conversation_name.slice(26, 27)) : (+rows[0].conversation_name.slice(32, 33));
        db.query(
          `SELECT contact.id, first_name, last_name, profile_photo_url
          
          FROM contact
  
          WHERE contact.id = $1
          `, [otherUserID]
        )
          .then(({ rows }) => {
            res.json(rows[0]);
          });
      }
    });
  });

  //This route is used for live searching for a user within the database using the search bar
  router.get('/searchuser', validateToken, (req, res) => {
    const searchUserInput = `%${req.query.searchValue}%`;
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

    const conditionOne = `Conversation between user ${loggedInUserID} and ${contactYouAreStartingAConvoWith}`;
    const conditionTwo = `Conversation between user ${contactYouAreStartingAConvoWith} and ${loggedInUserID}`;

    db.query(`
    SELECT conversation.id AS conversation_id 
    FROM conversation 
    WHERE conversation_name = $1
    OR conversation_name = $2;
    `, [conditionOne, conditionTwo])
      .then(({ rows }) => {
        res.json({ rows });
      });
  });

  //This route will be accessed in the chat input component, before a message is sent a get request ensures that both indivduals are participants in that conversation before allowing user input in that conversation (this is for the case where a participant has closed a convo, which removes them from that convo. Therefore whenr eopening need to add them back).
  router.get('/participantspresent', validateToken, (req, res) => {
    const loggedInUserID = req.contact.id;
    const convoID = req.query.convoID;

    console.log('Hello from your contact ID and and CONVO ID in your participantspresent route', loggedInUserID, convoID);

    // SELECT message.contact_id AS message_contact_id_always_not_null, participant.contact_id AS participant_contact_id_sometimes_null
    // FROM participant JOIN conversation ON conversation_id = conversation.id JOIN message ON conversation.id = message.conversation_id
    // WHERE participant.conversation_id = 1  AND message.contact_id = 1;
    // LIMIT 2;

    db.query(`
    SELECT contact_id FROM participant WHERE conversation_id = ${convoID}
    `)
      .then(({ rows }) => {
        res.json({ rows, loggedInUserID: loggedInUserID });
      });
  });

  //This route is used specifically when you are messaging an individual who has closed your existing conversation on their end and we need to add them back to the convo. First start by getting that individuals contact ID from conversation_name.
  router.get('/useconvoIDtogetcontactID', validateToken, (req, res) => {
    const convoID = req.query.convoID;

    console.log('Hello from your CONVO ID trying to fix leave participant conversation', convoID);

    db.query(`
    SELECT conversation_name FROM conversation WHERE conversation.id = ${convoID}
    `)
      .then(({ rows }) => {
        res.json({ rows });
      });
  });

  //This route receives the correct contact ID of the individual who closed a conversation on their end who you are trying to message, and adds them back to the convo in the process of messaging them.
  router.post('/addparticipantwholeftbacktoconvo', validateToken, (req, res) => {
    const contactID = req.body.contactID;
    const convoID = req.body.convoID;

    console.log('HELLO FROM THE CONVOID and the CONTACT ID of the individual who left', convoID, contactID);

    db.query(`
    INSERT INTO participant (conversation_id, contact_id)
    VALUES ($1, $2);
    `, [convoID, contactID])
      .then(({ rows }) => {
        res.json(rows);
      });
  });

  router.post('/addloggedinuserbacktoconvo', validateToken, (req, res) => {
    const loggedInUserID = req.contact.id;
    const convoID = req.body.convoID;

    console.log('HELLO FROM THE CONVOID in the add participant back route', convoID);

    db.query(`
    INSERT INTO participant (conversation_id, contact_id)
    VALUES ($1, $2);
    `, [convoID.conversation_id, loggedInUserID])
      .then(({ rows }) => {
        res.json(rows);
      });
  });

  router.get('/amipresent', validateToken, (req, res) => {
    const loggedInUserID = req.contact.id;
    const convoID = req.query.convoID.conversation_id;

    console.log('working 1', convoID);

    db.query(`
    SELECT *
    FROM participant
    WHERE conversation_id = $1
    AND contact_id = $2;
    `, [convoID, loggedInUserID])
      .then(({ rows }) => {
        res.json(rows[0]);
      });
  });

  //The route we will use to add the contact you are speaking with back to the convo after they have left.
  router.post('/addparticipantbacktoconvo', validateToken, (req, res) => {
    const loggedInUserID = req.contact.id;
    const convoID = req.body.convoID;

    console.log('HELLO FROM THE CONVOID in the add participant back route', convoID);

    // db.query(`INSERT INTO participant (conversation_id, contact_id) VALUES (${convoID}, ${loggedInUserID});
    // `)
    //   .then(({ rows }) => {
    //     res.json(rows);
    //   });
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
    VALUES(5, 'A conversation has started between ${req.contact.firstName} ${req.contact.lastName} and ${contactFirstName} ${contactLastName}.', NOW(), (SELECT LAST_VALUE("id") OVER (ORDER BY "id" DESC) FROM conversation LIMIT 1)); 
  `)
      //Important note, upon deployment if database is adjsuted and admin user is changed, we must change the number 5 in insert query.
      .then(({ rows }) => {
        // res.json(rows);
        res.json({ rows });
      });
  });

  router.delete('/deleteparticipant', validateToken, (req, res) => {
    const loggedInContactID = req.contact.id;
    const convoID = req.query.convoID;

    db.query(`
    UPDATE participant
    SET participating = false
    WHERE conversation_id = $1
    AND contact_id = $2;
    `, [convoID, loggedInContactID])
      .then(({ rows }) => {
        res.json({ rows, success: true });
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
          registerContact(db, firstName, lastName, username, email, hashedPassword, "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png", "hello").then(contact => {
            const accessToken = createToken(contact);

            req.session.accessToken = accessToken;

            const loggedInUser = {
              id: contact.id,
              firstName: contact.first_name,
              lastName: contact.last_name,
              profilePhotoURL: contact.profile_photo_url
            };

            return res.json({ error: null, authenticated: true, loggedInUser });
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

        const loggedInUser = {
          id: contact.id,
          firstName: contact.first_name,
          lastName: contact.last_name,
          profilePhotoURL: contact.profile_photo_url
        };

        return res.json({ error: null, authenticated: true, loggedInUser });
      } else {
        return res.status(400).json({ error: "Incorrect email or password!" });
      }
    });

  });

  router.post("/authenticate", validateToken, (req, res) => {
    const authenticated = req.authenticated;
    const contact = req.contact;
    return res.json({ authenticated, contact });
  });

  router.post("/logout", validateToken, (req, res) => {
    req.session.destroy();
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

  router.get('/conversations', validateToken, (req, res) => {
    const loggedInUser = req.contact;
    db.query(`
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
  `, [loggedInUser.id])
      .then(({ rows }) => {
        const conversations = [];
        let currentConversationId;
        let currentConversation;

        rows.forEach(row => {
          const { conversation_id, name, last_activity_datetime, am_i_present } = row;

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
                participating: row.other_participant_participating
              },
              lastMessage: {
                id: row.message_id,
                senderContactId: row.sender_contact_id,
                messageText: row.message_text,
                sentDatetime: row.sent_datetime,
              },
              last_activity_datetime,
              amIPresent: am_i_present
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

    db.query(`
    SELECT *
    FROM message
    WHERE conversation_id = $1; 
  `, [conversationID])
      .then(({ rows }) => {
        return res.json(rows);
      })
      .catch(error => {
        return res.status(400).json({ error });
      });
  });

  return router;
};
