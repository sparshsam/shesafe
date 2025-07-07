
const express = require('express');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const pinsRoute = require('./routes/pins');

const app = express();
const PORT = process.env.PORT || 3000;

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 1,
  message: "Too many pins submitted from this IP, please wait."
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use('/api/pins', limiter, pinsRoute);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/index.html'));
});

app.listen(PORT, () => console.log(`SheSafe running on port ${PORT}`));
