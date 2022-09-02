const express = require('express')
const app = express()
const port = 3000
const axios = require('axios');

const cors = require('cors');
app.use(cors())

app.get('/', (req, res) => {
  res.send('Hello World!!!!!')
})

app.get("/api/nonces", async (req, res) => {
  try {
      const response = await axios.get("https://api.printful.com/products")
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

