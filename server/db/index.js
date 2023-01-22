//This file houses the pg connection between Express Server and PostgreSQL database

// const { Pool } = require('pg');

// const pool = new Pool({
//   user: 'vagrant',
//   password: '123',
//   host: 'localhost',
//   database: 'charla'
// });

// pool.query(`
// SELECT id, first_name, last_name, user_name
// FROM contact;`)
// .then(res => {
//   console.log(res.rows);
// })
// .catch(err => console.error('query error', err.stack));

// module.exports = pool;