DROP TABLE IF EXISTS conversation CASCADE;
DROP TABLE IF EXISTS message CASCADE;
DROP TABLE IF EXISTS contact CASCADE;
DROP TABLE IF EXISTS group_member CASCADE;


-- Must determine if we want conversation name to be mandatory or not, would be good for groups but not for individual conversations
CREATE TABLE conversation (
  id SERIAL PRIMARY KEY NOT NULL,
  conversation_name VARCHAR(250)
);

-- Might need to adjust passwrd hash length from 255, as hash might be more then this!
CREATE TABLE contact (
  id SERIAL PRIMARY KEY NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  profile_photo_url VARCHAR(255) NOT NULL
);
-- Use of TIMESTAMPTZ allows for value to be stored as UTC and automatically adjusts when db experiences timezone change
CREATE TABLE message (
  id SERIAL PRIMARY KEY NOT NULL,
  contact_id INTEGER REFERENCES contact(id) ON DELETE CASCADE,
  message_text VARCHAR(2000) NOT NULL,
  sent_datetime VARCHAR(255) NOT NULL, 
  conversation_id INTEGER REFERENCES conversation(id) ON DELETE CASCADE
);

CREATE TABLE group_member (
  id SERIAL PRIMARY KEY NOT NULL,
  conversation_id INTEGER REFERENCES conversation(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES contact(id) ON DELETE CASCADE,
  joined_datetime VARCHAR(255) NOT NULL,
  left_datetime VARCHAR(255)
);
