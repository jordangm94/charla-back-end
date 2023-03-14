DELETE from contact;

INSERT INTO contact (first_name, last_name, user_name, email, password_hash, profile_photo_url)
VALUES ('Jordan', 'Guerrero Martinez', 'jordangm94', 'jordan.guerrero.martinez@gmail.com', '$2a$10$CfPpYSDuhZRoEwkLCMqZjuKJ8rLk3mKcS.vYWLIdxrYH4kOMrCaky', 'https://avatars.githubusercontent.com/u/111808635?v=4'),
('Jae Yun', 'Jeong', 'alex94', 'jeongalex0616@gmail.com', '$2a$10$CfPpYSDuhZRoEwkLCMqZjuKJ8rLk3mKcS.vYWLIdxrYH4kOMrCaky', 'https://avatars.githubusercontent.com/u/109401369?v=4'),
('Alessia', 'G', 'AlessiaG94', 'Alessiag94@gmail.com', '$2a$10$CfPpYSDuhZRoEwkLCMqZjuKJ8rLk3mKcS.vYWLIdxrYH4kOMrCaky', 'https://media.istockphoto.com/id/1311084168/photo/overjoyed-pretty-asian-woman-look-at-camera-with-sincere-laughter.jpg?b=1&s=170667a&w=0&k=20&c=XPuGhP9YyCWquTGT-tUFk6TwI-HZfOr1jNkehKQ17g0='),
('Jose', 'M', 'joseM94', 'jose94@gmail.com', '$2a$10$CfPpYSDuhZRoEwkLCMqZjuKJ8rLk3mKcS.vYWLIdxrYH4kOMrCaky', 'https://t4.ftcdn.net/jpg/02/24/86/95/360_F_224869519_aRaeLneqALfPNBzg0xxMZXghtvBXkfIA.jpg'),
('Charla', 'Admin', 'charlaadmin', 'charlaadmin@gmail.com', '$2a$10$CfPpYSDuhZRoEwkLCMqZjuKJ8rLk3mKcS.vYWLIdxrYH4kOMrCaky', 'https://e7.pngegg.com/pngimages/82/448/png-clipart-computer-technician-logo-illustration-system-administrator-database-administrator-computer-icons-administration-miscellaneous-computer-network-thumbnail.png');

DELETE from conversation;

INSERT INTO conversation (conversation_name) 
VALUES ('Conversation between user 1 and 2'),
('Conversation between user 1 and 3');

DELETE from participant;

INSERT INTO participant (conversation_id, contact_id)
VALUES (1, 1),
(1, 2),
(2, 1),
(2, 3);

DELETE from message;

INSERT INTO message (contact_id, message_text, sent_datetime, conversation_id)
VALUES (1, 'Hello', NOW(), 1),
(2, 'Hi there!', NOW(), 1),
(1, 'This is a cool app right?', NOW(), 1),
(2, 'Yes it is amazing!', NOW(), 1),
(1, 'Hey Alessia, how do you like our app?', NOW(), 2),
(3, 'Jordan! Oh my gosh, it is great!', NOW(), 2);

-- DELETE from group_member;

-- INSERT into group_member (conversation_id, contact_id, joined_datetime, left_datetime)
-- VALUES (1, 1, NOW(), NULL),
-- (1, 2, NOW(), NULL),
-- (2, 1, NOW(), NULL),
-- (2, 3, NOW(), NULL);