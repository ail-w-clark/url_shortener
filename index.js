require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dns = require('node:dns');
const { rmSync } = require('node:fs');
const { url } = require('node:inspector');

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.use('/', bodyParser.urlencoded({ extended:false }));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true }
});

const Url= mongoose.model('Url', urlSchema);


// Your first API endpoint
app.post('/api/shorturl', (req, res) => {
  const longUrl = req.body.url;

  try {
      const { hostname } = new URL(longUrl);
      dns.lookup(hostname, (err) => {
          if (err) {
              return res.json({ error: 'invalid url' });
          }

          Url.findOne({ original_url: longUrl }).exec()
              .then(existingUrl => {
                  if (existingUrl) {
                      return res.json({
                          original_url: existingUrl.original_url,
                          short_url: existingUrl.short_url
                      });
                  } else {
                      return Url.findOne().sort({ short_url: -1 }).exec();
                  }
              })
              .then(lastUrl => {
                  let shortUrl;
                  if (lastUrl && typeof lastUrl.short_url === 'number') {
                      shortUrl = lastUrl.short_url + 1;
                  } else {
                      shortUrl = 1; // Default short_url if lastUrl is not found
                  }
                  const newUrl = new Url({ original_url: longUrl, short_url: shortUrl });
                  return newUrl.save();
              })
              .then(savedUrl => {
                  return res.json({
                      original_url: savedUrl.original_url,
                      short_url: savedUrl.short_url
                  });
              })
              .catch(error => {
                  console.error('Error:', error);
                  if (!res.headersSent) {
                      return res.json({ error: 'something went wrong' });
                  }
              });
      });
  } catch (error) {
      console.error('Error in try-catch:', error);
      if (!res.headersSent) {
          return res.json({ error: 'invalid url' });
      }
  }
});

app.get('/api/shorturl/:shortUrl', (req, res) => {
    const shortUrl = req.params.shortUrl;

    Url.findOne({ short_url: shortUrl })
       .then(foundUrl => {
        res.redirect(foundUrl.original_url);
       });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

