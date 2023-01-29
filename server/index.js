const PORT = process.env.PORT || 8001;
const ENV = require("./environment");

const app = require("./application")(ENV, { getContactByEmail });
const server = require("http").Server(app);

function getContactByEmail(email) {
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

server.listen(PORT, () => {
  console.log(`Listening on port ${PORT} in ${ENV} mode.`);
});