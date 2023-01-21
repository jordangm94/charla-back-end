const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'charla'
});

pool.query(`
Select id, first_name, last_name, user_name
FROM contact;`)
.then(res => {
  console.log(res.rows);
})
.catch(err => console.error('query error', err.stack));

module.exports = pool;
