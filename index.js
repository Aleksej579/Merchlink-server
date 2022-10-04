const express = require('express')
const app = express()
const port = 3000
const axios = require('axios');
const cors = require('cors');
var bodyParser = require('body-parser');
app.use(cors());
app.use(bodyParser.json());

app.get("/", async (req, res) => {
  res.send('Server!');
});

// ?preview_theme_id=134752338164
// https://merchlink.com/account?my_collections
// https://test-server-v2.vercel.app

// NONCES
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
});

// GT-IMAGE
app.get('/api/gtkey/:gtkey', function (req, res) {
  try {
    axios.get(`https://api.printful.com/mockup-generator/task?task_key=${req.params.gtkey}`, {
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
});

// IMAGE
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
app.get("/api/template/:templateId", (req, res) => {
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

// ORDER | WRDKEDNXV3JS | 2YSVSDCPC181
let arrBody = [];
app.post('/api/orderprintful', async function(req, res) {
  for(let [index, item] of req.body.line_items.entries()) {
    const keyGt = item.properties[0].value;
    try {
      await axios.get(`https://api.printful.com/mockup-generator/task?task_key=${keyGt}`, {
        headers: {
          Authorization: 'Bearer xaAg8OBVXFK2f6iynNmkktVorMxyK8MyCJys2xOS',
          'X-PF-Store-ID': 5651474
        }
      }).then(response => {
        arrBody.push({
          "quantity": `${req.body.line_items[index].quantity}`,
          "variant_id": `${response.data.result.printfiles[0].variant_ids}`,
          "files": [{
            "placement": `${response.data.result.printfiles[0].placement}`,
            "url": `${response.data.result.printfiles[0].url}`
          }]
        });
      })
    }
    catch (err) {
      console.log(err);
    }
  }
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
    "items": arrBody
  };
  axios.post("https://api.printful.com/orders", body, { headers })
    .then((response) => {
      res.json(response.data);
    });
});
app.get('/api/orderprintful', function(req, res) {
    res.json(arrBody);
});

// METAFIELDS
app.post('/api/sendmetafield', function(req, res) {
  try {
    const customerId = req.body.metafield.namespace;
    axios.get(`https://all-u-sportswear.myshopify.com/admin/api/2022-07/customers/${customerId}/metafields.json`, {
      headers: {
        'X-Shopify-Access-Token': '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'
      }
    }).then((response) => {
        const headers = {
          'X-Shopify-Access-Token': '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',
          'Content-Type': 'application/json'
        };
        const body = {
          "metafield": {
            "namespace": "customer_id",
            "key": "collection_name",
            "value": `${req.body.metafield.value},${response.data.metafields[0]?response.data.metafields[0].value:''}`,
            "type": "single_line_text_field"
          }
        };
        axios.post(`https://all-u-sportswear.myshopify.com/admin/api/2022-07/customers/${customerId}/metafields.json`, body, { headers });
    });
  }
  catch (err) {
    console.log(err);
  }
});

// 7079208255649:gt-415460465,6551978049697:gt-415086002,7079243284641:gt-415080485,7529999663348:gt-413879759,7530009624820:gt-413854572,7858672238836:gt-413787274,7879952859380:gt-413786068,7879952859380:gt-413784607,6627024666785:gt-413783049,7530009624820:gt-413551747,7530009624820:gt-413535040,7685257396468:gt-413533226,7779733602548:gt-413491003,7779733602548:gt-413487307,6627024666785:gt-413482171,7858672238836:gt-410404801,
// METAFIELDS remove products
app.post('/api/changemetafield', function(req, res) {
  try {
    const customerId = req.body.customer_id;
    const product_template = req.body.product_template;
    axios.get(`https://all-u-sportswear.myshopify.com/admin/api/2022-07/customers/${customerId}/metafields.json`, {
      headers: {
        'X-Shopify-Access-Token': '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'
      }
    }).then((response) => {
      const existData = response.data.metafields[0]?response.data.metafields[0].value:'';
      const newData = existData.replace(/product_template/g, '');
      const headers = {
        'X-Shopify-Access-Token': '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',
        'Content-Type': 'application/json'
      };
      const body = {
        "metafield": {
          "namespace": "customer_id",
          "key": "collection_name",
          "value": `${newData}`,
          "type": "single_line_text_field"
        }
      };
      axios.post(`https://all-u-sportswear.myshopify.com/admin/api/2022-07/customers/${customerId}/metafields.json`, body, { headers });
    })
  }
  catch (err) {
    console.log(err);
  }
});
app.get('/api/changemetafield', function(req, res) {
  res.json();
});



app.get('*', (req, res) => {
  res.status(500).json({ message: "error" })
});

app.listen(port);
module.exports = app;