DROP TABLE IF EXISTS conversation CASCADE;
DROP TABLE IF EXISTS message CASCADE;
DROP TABLE IF EXISTS contact CASCADE;
DROP TABLE IF EXISTS participant CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS session CASCADE;
-- DROP TABLE IF EXISTS group_member CASCADE;

-- Might need to adjust password hash length from 255, as hash might be more then this!
CREATE TABLE contact (
  id SERIAL PRIMARY KEY NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  profile_photo_url VARCHAR(255) NOT NULL
);

-- Must determine if we want conversation name to be mandatory or not, would be good for groups but not for individual conversations
CREATE TABLE conversation (
  id SERIAL PRIMARY KEY NOT NULL,
  conversation_name VARCHAR(250)
);

CREATE TABLE participant (
  id SERIAL PRIMARY KEY NOT NULL,
  conversation_id INTEGER REFERENCES conversation(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES contact(id) ON DELETE CASCADE
);

CREATE TABLE message (
  id SERIAL PRIMARY KEY NOT NULL,
  contact_id INTEGER REFERENCES contact(id) ON DELETE CASCADE,
  message_text VARCHAR(2000) NOT NULL,
  sent_datetime VARCHAR(255) NOT NULL, 
  conversation_id INTEGER REFERENCES conversation(id) ON DELETE CASCADE
);

CREATE TABLE feedback (
  id SERIAL PRIMARY KEY NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  message VARCHAR(2000) NOT NULL 
);

CREATE TABLE "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamptz(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX "IDX_session_expire" ON "session" ("expire");

-- CREATE TABLE group_member (
--   id SERIAL PRIMARY KEY NOT NULL,
--   conversation_id INTEGER REFERENCES conversation(id),
--   contact_id INTEGER REFERENCES contact(id),
--   joined_datetime VARCHAR(255) NOT NULL,
--   left_datetime VARCHAR(255)
-- );
