const express = require('express');
let healthy = true;

const app = express();

app.get('/ok', (req, res) => {
  res.status(200).send('ok');
});

app.get('/slow', (req, res) => {
  setTimeout(() => {
    res.status(200).send('slow');
  }, 3000);
});

app.get('/flaky', (req, res) => {
  if (healthy) {
    return res.status(200).send('fine');
  }
  res.status(503).send('down');
});

app.post('/toggle', (req, res) => {
  healthy = !healthy;
  res.json({ healthy });
});

app.listen(4000, () => {
  console.log('Fake target running on http://localhost:4000');
});
