DROP TABLE IF EXISTS message CASCADE;

-- Use of TIMESTAMPTZ allows for value to be stored as UTC and automatically adjusts when db experiences timezone change
CREATE TABLE message (
  id SERIAL PRIMARY KEY NOT NULL,
  message_text VARCHAR(2000) NOT NULL,
  sent_datetime TIMESTAMPTZ, 
);