require('dotenv').config();
const express = require('express')
const app = express()
const port = 3000
const axios = require('axios');
const cors = require('cors');
var bodyParser = require('body-parser');
const fileupload = require('express-fileupload');
const fetch = require('node-fetch');
const fs = require('fs');

const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  secure: true,
});

app.use(cors());
app.use(bodyParser.json());
app.use(fileupload({
  limits: {
      fileSize: 10000000,
  },
  abortOnLimit: true,
}));


app.get("/", async (req, res) => {
  res.send('Server!');
});





// test get all templateі
app.get('/test-get-alltemplates', (req, res) => {
  try {
    axios.get(`https://api.printful.com/product-templates`, {
      headers: { Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }
    }).then(resp => {res.json(resp.data);});
  }
  catch (err) {console.log(err);}
});
// test get template
app.get('/test-get-template/:template', (req, res) => {
  try {
    axios.get(`https://api.printful.com/product-templates/@${req.params.template}`, {
      headers: { Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }
    }).then(resp => {res.json(resp.data);});
  }
  catch (err) {console.log(err);}
});

// test get gt-data
app.get('/test-get-gt/:gt', (req, res) => {
  try {
    axios.get(`https://api.printful.com/mockup-generator/task?task_key=${req.params.gt}`, {
      headers: { Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }
    }).then(resp => {res.json(resp.data);});
  }
  catch (err) {console.log(err);}
});
// test get variantid
app.get('/test-get-variantid/:variantid', (req, res) => {
  try {
    axios.get(`https://api.printful.com/products/variant/${req.params.variantid}`, {
      headers: { Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }
    }).then(resp => {res.json(resp.data);});
  }
  catch (err) {console.log(err);}
});



// NONCES
app.get("/api/nonces/:userId", async (req, res) => {
  try {
    const token = process.env.TOKEN_PRINTFUL;
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

// GT-IMAGE + save image
app.get('/api/gtkey/:gtkey', function (req, res) {
  try {
    axios.get(`https://api.printful.com/mockup-generator/task?task_key=${req.params.gtkey}`, {
      headers: {
        Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`,
        'X-PF-Store-ID': process.env.STORE_ID
      }
    }).then(resp => {
      res.json(resp.data);
    });
  }
  catch (err) {
      console.log(err);
  }
});

// app.use('/static', express.static(__dirname + '/customers'));



// TASK_KEY + CLOUDINARY
app.get("/api/template/:templateId/:customer", (req, res) => {
  if (req.params.templateId) {
    try {
      
      axios.get(`https://api.printful.com/product-templates/@${req.params.templateId}`, 
        {
          headers: {Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`}
        }
      ).then( (resTemplates) => {
        return axios.post(`https://api.printful.com/mockup-generator/create-task/${req.params.templateId}`, 
          {
            "variant_ids": resTemplates.data.result.available_variant_ids,
            "format": "jpg",
            "product_template_id": resTemplates.data.result.id
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.TOKEN_PRINTFUL}`,
              'X-PF-Store-ID': process.env.STORE_ID
            }
          }
        )
        }).then((resMockup) => {
          res.json(resMockup.data.result.task_key);

          setTimeout(() => {
            let gt = resMockup.data.result.task_key;
            let customer = req.params.customer;
            // fs.mkdirSync(`./customers/${customer}/${gt}`, { recursive: true });
            axios.get(`https://api.printful.com/mockup-generator/task?task_key=${gt}`, 
              {
                headers: {
                  Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`,
                  'X-PF-Store-ID': process.env.STORE_ID
                }
              }
            ).then(async (resp) => {
              let arrLinkToImage = resp.data.result.mockups;
              let arrLinkToImagePrintfiles = resp.data.result.printfiles;

              await arrLinkToImage.forEach((element, index) => {
                fetch(element.mockup_url).then(res => {
                  // res.body.pipe(fs.createWriteStream(`./customers/${customer}/${gt}/image-${index}.png`));
                  cloudinary.uploader
                    .upload(element.mockup_url, {
                      resource_type: "image",
                      public_id: `customers/${customer}/${gt}/image-${index}`,
                      overwrite: true
                    });
                });
              });


              await arrLinkToImagePrintfiles.forEach((element, index) => {
                fetch(element.url).then(res => {
                  // res.body.pipe(fs.createWriteStream(`./customers/${customer}/${gt}/image-${index}.png`));
                  cloudinary.uploader
                    .upload(element.url, {
                      resource_type: "image",
                      public_id: `customers/${customer}/${gt}/image__printfiles-${index}`,
                      overwrite: true
                    });
                });
              });


            });
          }, 5000);
        })
    }
    catch (err) {
        console.log(err)
    }
  }
});

// IMAGE not from gt
app.get('/api/image/:prodId', function(req, res) {
  try {
    axios.get(`https://api.printful.com/product-templates/@${req.params.prodId}`, {
      headers: {Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`}
    }).then(resp => {
      res.json(resp.data);
    });
  }
  catch (err) {
      console.log(err)
  }
});


// ORDER   https://test-server-v2.vercel.app/api/orderprintful

let arrBody = [];
app.post('/api/orderprintful', async function(req, res) {
  for(let [index, item] of req.body.line_items.entries()) {
    // if (item.properties[0]?.value != "") {
    if (item.properties[0].value != "") {
      try {
        const keyGt = item.properties[0].value;
        await axios.get(`https://api.printful.com/mockup-generator/task?task_key=${keyGt}`, {
          headers: {
            'Authorization': `Bearer ${process.env.TOKEN_PRINTFUL}`,
            'X-PF-Store-ID': process.env.STORE_ID
          }
        }).then(response => {
          arrBody.push({
            "variant_id": +`${response.data.result.printfiles[0].variant_ids}`.split(',')[0],
            "quantity": +`${req.body.line_items[index].quantity}`,
            "files": [
              {
                "placement": `${response.data.result.printfiles[0].placement}`,
                "url": `https://res.cloudinary.com/dqyorwnfk/image/upload/customers/${req.body.customer.id}/${keyGt}/image__printfiles-${0}.jpg`
              }
            ]
          });
        })
      }
      catch (err) {
        console.log(err);
      }
    } else {
      try {
        await axios.get(`https://all-u-sportswear.myshopify.com/admin/products/${req.body.line_items[index].product_id}/metafields.json`, {
          headers: { 
            'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY 
          }
        }).then( async (resp) => {
          await axios.get(`https://api.printful.com/product-templates/@${resp.data.metafields[0].value}`, {
            headers: { 
              'Authorization': `Bearer ${process.env.TOKEN_PRINTFUL}`,
              'X-PF-Store-ID': process.env.STORE_ID 
            }
          }).then( async (resp) => {
            arrBody.push(
              {
                "variant_id": +`${req.body.line_items[index].sku}`.split('_')[1],
                "quantity": +`${req.body.line_items[index].quantity}`,
                "product_template_id": +`${resp.data.result.id}`
              }
            );
          })
        });
      }
      catch (err) {
        console.log(err);
      }
    }
  }

  let printful = [];
  for(let item of arrBody) {
    if (item.hasOwnProperty('files')) {
      printful.push(true);
    }else {
      printful.push(false);
    }
  }
  if (printful.includes(true)) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.TOKEN_PRINTFUL}`,
      'X-PF-Store-ID': process.env.STORE_ID
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
    try{
      await axios.post("https://api.printful.com/orders", body, { headers })
        .then((response) => {
          res.json(response.data);
          arrBody.length = 0;
        });
    }
    catch (err) {
      console.log(err);
    }
  }
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
        'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY
      }
    }).then((response) => {
        const headers = {
          'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY,
          'Content-Type': 'application/json'
        };
        const body = {
          "metafield": {
            "namespace": "customer_id",
            "key": "collection_name",
            "value": `${req.body.metafield.value},${response.data.metafields[0]?response.data.metafields[0].value:'#My collection'}`,
            "type": "single_line_text_field"
          }
        };
        axios.post(`https://all-u-sportswear.myshopify.com/admin/api/2022-07/customers/${customerId}/metafields.json`, body, { headers })
          .then((response) => {
            res.json(response.data);
          });
    });
  }
  catch (err) {
    console.log(err);
  }
});

// METAFIELDS remove products
app.post('/api/changemetafield', function(req, res) {
  try {
    const customerId = req.body.customer_id;
    const product_template = req.body.product_template;
    const product_template_gt = req.body.product_template_gt;

    axios.get(`https://all-u-sportswear.myshopify.com/admin/api/2022-07/customers/${customerId}/metafields.json`, {
      headers: {
        'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY
      }
    }).then((response) => {

      const existData = response.data.metafields[0]?response.data.metafields[0].value:'';
      const newData = existData.replace(`${product_template},`, '');

      const headers = {
        'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY,
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

      cloudinary.api
        .delete_resources_by_prefix(`customers/${customerId}/${product_template_gt}`, function(result){})
        .then(() => {
          cloudinary.api
            .delete_folder(`customers/${customerId}/${product_template_gt}`)
            .then((result) => {
              res.json(result);
            });
        })
    })
  }
  catch (err) {
    console.log(err);
  }
});
app.get('/api/changemetafield', function(req, res) {
  res.json();
});

// METAFIELD name-collection
app.post('/api/namecoll', function(req, res) {
  try {
    const customerId = req.body.userid;
    const nameColl = req.body.newName;
    axios.get(`https://all-u-sportswear.myshopify.com/admin/api/2022-07/customers/${customerId}/metafields.json`, {
      headers: {
        'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY
      }
    }).then((response) => {
      const existData = response.data.metafields[0]?response.data.metafields[0].value:'';
      const reg = /#(.*)/;
      const newData = existData.replace(reg, `#${nameColl}`);
      const headers = {
        'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY,
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
      axios.post(`https://all-u-sportswear.myshopify.com/admin/api/2022-07/customers/${customerId}/metafields.json`, body, { headers })
        .then((response) => {
          res.json(response.data);
        });
    })
  }
  catch (err) {
    console.log(err);
  }
});

// METAFIELDS public page
app.post('/api/publiccollection', function(req, res) {
  try {
    const headers = {
      'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY,
      'Content-Type': 'application/json'
    };
    const body = {
      "metafield": {
        "namespace": `${req.body.userid}`,
        "key": `${req.body.userid}`,
        "value": `${req.body.metaf}`,
        "type": "single_line_text_field"
      }
    };
    axios.post('https://all-u-sportswear.myshopify.com/admin/api/2022-10/metafields.json', body, { headers })
      .then(() => {
        const headers = {
          'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY,
          'Content-Type': 'application/json'
        };
        const body = {
          "metafield": {
            "namespace": `${req.body.userid}-image_coll`,
            "key": `${req.body.userid}-image_coll`,
            "value": `${req.body.imageLogoCatalogSrc}`,
            "type": "single_line_text_field"
          }
        };
        axios.post('https://all-u-sportswear.myshopify.com/admin/api/2022-10/metafields.json', body, { headers })
      });
  }
  catch (err) {
    console.log(err);
  }
});

let arrImageColl = []
app.post('/api/logocollection/:userId', function(req, res) {
  try {
    // arrImageColl.push(req.files);
    arrImageColl.push(req.body);

    const headers = {
      'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY,
      'Content-Type': 'application/json'
    };
    const body = {
      "metafield": {
        "namespace": "custom",
        "key": "collection_image_base",
        "value": req.body.baseImage,
        "type": "single_line_text_field"
      }
    };
    axios.post(`https://all-u-sportswear.myshopify.com/admin/api/2022-07/customers/${req.params.userId}/metafields.json`, body, { headers })
      .then((response) => {
        res.json(response.data);
      });
  }
  catch (err) {
    console.log(err);
  }
});
app.get('/api/logocollection', function(req, res) {
  res.json(arrImageColl);
});

app.get('*', (req, res) => {
  res.status(500).json({ message: "error" })
});

app.listen(port);
module.exports = app;