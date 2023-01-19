DELETE from conversation;

INSERT INTO conversation (conversation_name) VALUES ('First Conversation');

DELETE from message;

INSERT INTO message (message_text, sent_datetime, conversation_id)
VALUES ('Hello', NOW(), 1),
('Hi there!', NOW(), 1),
('This is a cool app right?', NOW(), 1),
('Yes it is amazing!', NOW(), 1);


