const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const texts = {};

router.post('/save', (req, res) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).send('Access Denied');

  const decoded = jwt.verify(token, 'secretkey');
  texts[decoded.id] = req.body.text;
  res.send('Text saved');
});

router.get('/get', (req, res) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).send('Access Denied');

  const decoded = jwt.verify(token, 'secretkey');
  res.json({ text: texts[decoded.id] || '' });
});

module.exports = router;
