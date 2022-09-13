const arrOrderJson = require('./data_order_shopify');

const express = require('express')
const app = express()
const port = 3000
const axios = require('axios');
const cors = require('cors');
var bodyParser = require('body-parser');
app.use(cors());
app.use(bodyParser.json());

// ?preview_theme_id=134752338164
// https://test-server-v2.vercel.app/

app.get("/", async (req, res) => {
  res.send('Main page !');
})

app.get("/api/nonces/:userId", async (req, res) => {
  try {
    const token = 'xaAg8OBVXFK2f6iynNmkktVorMxyK8MyCJys2xOS';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    const body = {"external_product_id": `${req.params.userId}`};
    const response = await axios.post("https://api.printful.com/embedded-designer/nonces", body, { headers });
    res.json(response.data);
  }
  catch (err) {
      console.log(err)
  }
})

// image
app.get('/api/image/:prodId', function(req, res) {
  try {
    axios.get(`https://api.printful.com/product-templates/@${req.params.prodId}`, {
      headers: {Authorization: 'Bearer xaAg8OBVXFK2f6iynNmkktVorMxyK8MyCJys2xOS'}
    }).then(resp => {
      res.json(resp.data);
    });
  }
  catch (err) {
      console.log(err)
  }
});

app.get("/api/template/:templateId", async (req, res) => {
  if (req.params.templateId) {
    try {
      axios.get(`https://api.printful.com/product-templates/@${req.params.templateId}`, {
        headers: {Authorization: 'Bearer xaAg8OBVXFK2f6iynNmkktVorMxyK8MyCJys2xOS'}
      }).then(resTemplates => {
        return axios.post(`https://api.printful.com/mockup-generator/create-task/${req.params.templateId}`, 
        {
          "variant_ids": resTemplates.data.result.available_variant_ids,
          "format": "jpg",
          "product_template_id": resTemplates.data.result.id
        },
        {
          headers: {
            'Authorization': 'Bearer xaAg8OBVXFK2f6iynNmkktVorMxyK8MyCJys2xOS',
            'X-PF-Store-ID': 5651474
          }
        }
      )
      }).then(resMockup => {
        // const path = 'https://api.printful.com/mockup-generator/task?task_key=gt-405776728';
        const path = `https://api.printful.com/mockup-generator/task?task_key=${resMockup.data.result.task_key}`;
        // console.log(resMockup.data.result.task_key);
        axios.get(path, {
            headers: {
              Authorization: 'Bearer xaAg8OBVXFK2f6iynNmkktVorMxyK8MyCJys2xOS',
              'X-PF-Store-ID': 5651474
            }
          }).then(response => {
            res.json(response.data);
          })
        })
    }
    catch (err) {
        console.log(err)
    }
  }
})

let arrOrder = [];
app.post('/api/orderprintful', async function(req, res) {
  res.send(test);
  req.body;
  if (req.body) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer xaAg8OBVXFK2f6iynNmkktVorMxyK8MyCJys2xOS',
        'X-PF-Store-ID': '5651474'
      };
      const body = {
        "recipient": {
          "name": `${req.body.customer.first_name} ${req.body.customer.last_name}`,
          "address1": `${req.body.customer.default_address.address1}`,
          "city": `${req.body.customer.default_address.city}`,
          "state_code": `${req.body.customer.default_address.province_code}`,
          "country_code": `${req.body.customer.default_address.country_code}`,
          "zip": `${req.body.customer.default_address.zip}`
        },
        "items": [{
          "quantity": `${req.body.line_items[0].quantity}`,
          "variant_id": 9430,
          "files": [{
            "placement": "embroidery_chest_left",
            "url": "https://printful-upload.s3-accelerate.amazonaws.com/tmp/0149e231cd0c38e133690e411bec1947/printfile_embroidery_chest_left.png"
          }]
        }]
      };
      // const response = await axios.post("https://api.printful.com/orders", body, { headers });
      arrOrder.unshift(response.data);
      res.json(response.data);
    }
    catch (err) {
        console.log(err);
    }
  }
});

app.get('/api/orderprintful', function(req, res) {
    res.json(arrOrder[0]);
});

app.get('*', (req, res) => {
  res.status(500).json({ message: "error" })
})

app.listen(port);
module.exports = app;