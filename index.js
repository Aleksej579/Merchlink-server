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

// app.get("/api/products", async (req, res) => {
//   try {
//       const response = await axios.get("https://api.printful.com/products")
//       res.json(response.data)
//   }
//   catch (err) {
//       console.log(err)
//   }
// })

app.post('/api/test', function(req, res) {
  // console.log(req.body);
  // console.log(true);
  if (!req.body) return res.sendStatus(400);
  console.log(req.body);
  res.end();
});


app.get("/api/nonces", async (req, res) => {
  try {
    const token = 'xaAg8OBVXFK2f6iynNmkktVorMxyK8MyCJys2xOS';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
    const body = {
        "external_product_id": "307"
    }
    const response = await axios.post("https://api.printful.com/embedded-designer/nonces", body, { headers })
    res.json(response.data)
  }
  catch (err) {
      console.log(err)
  }
})






app.get('*', (req, res) => {
  res.status(500).json({ message: "error" })
})

app.listen(port);
module.exports = app;