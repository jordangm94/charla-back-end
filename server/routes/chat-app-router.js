const express = require('express');
const router = express.Router();

/////////////////////////////////
/// Index
/////////////////////////////////

module.exports = db => {
  router.get('/', (req, res) => {
    res.send('Hello from the CHAT APP!');
  });
  return router;
}

module.exports = router;