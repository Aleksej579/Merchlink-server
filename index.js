const express = require('express')
const app = express()
const port = 3000
const axios = require('axios');
const cors = require('cors');
var bodyParser = require('body-parser');
app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Hello World!!!!!')
})

app.post('/api/id', function(req, res) {
  res.json();
});
app.get('/api/id', function(req, res) {
  res.json();
});

app.get("/api/nonces/:userId", async (req, res) => {
  try {
    const token = 'xaAg8OBVXFK2f6iynNmkktVorMxyK8MyCJys2xOS';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
    const body = {
        "external_product_id": `${req.params.userId}`
    }
    const response = await axios.post("https://api.printful.com/embedded-designer/nonces", body, { headers })
    res.json(response.data)
  }
  catch (err) {
      console.log(err)
  }
})



app.post('/api/order', function(req, res) {
  res.json();
});
app.get('/api/order', function(req, res) {
  res.json();
});



app.get('*', (req, res) => {
  res.status(500).json({ message: "error" })
})

app.listen(port);
module.exports = app;