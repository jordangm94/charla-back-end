//Use special router object offered by Express

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('Hello')
});

module.exports = router;