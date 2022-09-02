const express = require('express')
const app = express()
const port = 3000
const axios = require('axios');
const cors = require('cors');
app.use(cors())

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

app.post("/api/nonces-id", async (req, res) => {
  try {
    res.send('Hello World!!!!!')
  }
  catch (err) {
      console.log(err)
  }
})
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