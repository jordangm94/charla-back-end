DROP TABLE IF EXISTS conversation CASCADE;
DROP TABLE IF EXISTS message CASCADE;

-- Must determine if we want conversation name to be mandatory or not, would be good for groups but not for individual conversations
CREATE TABLE conversation (
  id SERIAL PRIMARY KEY NOT NULL,
  conversation_name VARCHAR(250)
);
-- Use of TIMESTAMPTZ allows for value to be stored as UTC and automatically adjusts when db experiences timezone change
CREATE TABLE message (
  id SERIAL PRIMARY KEY NOT NULL,
  message_text VARCHAR(2000) NOT NULL,
  sent_datetime TIMESTAMPTZ, 
  conversation_id INTEGER REFERENCES conversation(id) ON DELETE CASCADE
);