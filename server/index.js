const PORT = process.env.PORT || 8001;
const ENV = require("./environment");

const app = require("./application")(ENV, { getContactByEmail, getContactByUsername, registerContact });
const server = require("http").Server(app);

function getContactByEmail(db, email) {
  const queryString = `
    SELECT *
    FROM contact
    WHERE email = $1
  `;
  return db.query(queryString, [email])
    .then(result => {
      return result.rows[0];
    })
    .catch(error => {
      console.log(error.message);
    });
};

function getContactByUsername(db, username) {
  const queryString = `
    SELECT *
    FROM contact
    WHERE user_name = $1
  `;
  return db.query(queryString, [username])
    .then(result => {
      return result.rows[0];
    })
    .catch(error => {
      console.log(error.message);
    });
};

function registerContact(db, firstName, lastName, username, email, hashedPassword, profilePic) {
  const queryString = `
    INSERT INTO contact (first_name, last_name, user_name, email, password_hash, profile_photo_url)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const params = [firstName, lastName, username, email, hashedPassword, profilePic];

  return db.query(queryString, params)
    .then(result => {
      return result.rows[0];
    })
    .catch(error => {
      console.log(error.message);
    });
};

server.listen(PORT, () => {
  console.log(`Listening on port ${PORT} in ${ENV} mode.`);
});