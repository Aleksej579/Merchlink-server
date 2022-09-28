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
// https://test-server-v2.vercel.app
// https://merchlink.com/account?my_collections
// https://test-server-v2.vercel.app/api/sendmetafield

app.get("/", async (req, res) => {
  res.send('Main page server customizer!');
})

// get NONCES to start customizer
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

// get IMG from printful by GT-...
app.get('/api/gtkey/:gtkey', function (req, res) {
  try {
    const key_gt = req.params.gtkey;
    axios.get(`https://api.printful.com/mockup-generator/task?task_key=${key_gt}`, {
      headers: {
        Authorization: 'Bearer xaAg8OBVXFK2f6iynNmkktVorMxyK8MyCJys2xOS',
        'X-PF-Store-ID': 5651474
      }
    }).then(resp => {
      res.json(resp.data);
    });
  }
  catch (err) {
      console.log(err);
  }
})

// get IMAGE to change in DPP
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

// get TASK_KEY to complete json order in next step
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
        res.json(resMockup.data.result.task_key);
      })
    }
    catch (err) {
        console.log(err)
    }
  }
});

// create json to send ORDER
let arrOrder = [];
app.post('/api/orderprintful', async function(req, res) {
  arrOrder.push(req.body)
  try {
    const key = req.body.line_items[0].properties.customize_detail_order || 'gt-407088560';
    axios.get(`https://api.printful.com/mockup-generator/task?task_key=${key}`, {
        headers: {
          Authorization: 'Bearer xaAg8OBVXFK2f6iynNmkktVorMxyK8MyCJys2xOS',
          'X-PF-Store-ID': 5651474
        }
      }).then(response => {
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
            "variant_id": `${response.data.result.printfiles[0].variant_ids}`,
            "files": [{
              "placement": `${response.data.result.printfiles[0].placement}`,
              "url": `${response.data.result.printfiles[0].url}`
            }]
          }]
        };
        axios.post("https://api.printful.com/orders", body, { headers })
          .then((response) => {
            res.json(response.data);
          });
      })
  }
  catch (err) {
    console.log(err);
  }
});
app.get('/api/orderprintful', function(req, res) {
    res.json(arrOrder);
});

// get & send data to metafields customer
let metafieldBody;
app.post('/api/sendmetafield', function(req, res) {
  try {
    const customerId = req.body.metafield.namespace;
    axios.get(`https://all-u-sportswear.myshopify.com/admin/api/2022-07/customers/${customerId}/metafields.json`, {
      headers: {
        'X-Shopify-Access-Token': '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'
      }
    })
      .then((response) => {
        // metafieldBody = response.data;

        newData = JSON.parse(response.data);
        if ( newData.hasOwnProperty('.metafields') & newData.metafields.length != 0 ) {
          // metafieldBody = `${req.body.metafield.value},${response.data.metafields[0].value}`;
          metafieldBody = `${req.body.metafield.value},`;
        } else {
          metafieldBody = `${req.body.metafield.value}`;
        }

        const headers = {
          'X-Shopify-Access-Token': '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',
          'Content-Type': 'application/json'
        };
        const metaValue = metafieldBody;
        const body = {
          "metafield": {
            "namespace": "customer_id",
            "key": "collection_name",
            "value": metaValue,
            "type": "single_line_text_field"
          }
        };
        axios.post(`https://all-u-sportswear.myshopify.com/admin/api/2022-07/customers/${customerId}/metafields.json`, body, { headers });
        res.json(response.data);
    });
  }
  catch (err) {
    console.log(err);
  }
});
app.get('/api/sendmetafield', function(req, res) {
  res.json(metafieldBody);
});

app.get('*', (req, res) => {
  res.status(500).json({ message: "error" })
})

app.listen(port);
module.exports = app;