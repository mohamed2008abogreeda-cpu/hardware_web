const express = require('express');
const app = express();
try {
  app.get('/test', (req, res) => res.send('ok'));
  console.log('SUCCESS: Express app.get works with string');
} catch (e) {
  console.error('FAILURE: Express app.get failed');
  console.error(e);
}
