require('dotenv').config();
const express = require('express')
const app = express()
const port = 3000
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
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

// HOME page
app.get("/", (req, res) => {
  res.send('Server!');
});
// app.get("/json", (req, res) => {
//   res.json({"test": true});
// });

// test get all template
app.get('/test-get-alltemplates', (req, res) => {
  try {
    axios.get(`https://api.printful.com/product-templates`, {headers: { Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }})
    .then(resp => {res.json(resp.data);});
  }
  catch (err) {console.log(err);}
});
// test get specific template
app.get('/test-get-template/:template', (req, res) => {
    axios.get(`https://api.printful.com/product-templates/@${req.params.template}`, {headers: { Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }})
    .then(resp => {res.json(resp.data)}).catch(err => console.log(err))
});
// Get templates If Error from Printful
app.get('/printful-templates', (req, res) => {
    axios.get(`https://api.printful.com/product-templates`, {headers: { Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }})
    .then(resp => {res.json(resp.data)}).catch(err => console.log(err))
});

app.get('/test-get-gt/:gt', (req, res) => {
  try {
    axios.get(`https://api.printful.com/mockup-generator/task?task_key=${req.params.gt}`, {headers: { Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }})
    .then(resp => {res.json(resp.data);});
  }
  catch (err) {console.log(err);}
});
// test get variantid
app.get('/test-get-variantid/:variantid', (req, res) => {
  try {
    axios.get(`https://api.printful.com/products/variant/${req.params.variantid}`, {headers: { Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }})
    .then(resp => {res.json(resp.data);});
  }
  catch (err) {console.log(err);}
});
  
// IMAGES for COLECTIONS
app.get('/api/gtkey/:gtkey', (req, res) => {
  if (req.params.gtkey !== "undefined") {
    try {
      axios.get(`https://api.printful.com/mockup-generator/task?task_key=${req.params.gtkey}`, {headers: { Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }})
      .then((resp) => {
        console.log(`IMAGE-collections: is-LOAD: product = ${req.params.gtkey}`)
        res.json(resp.data);
      });
    } catch (err) {console.log(err);}
  }
});

// NONCES open customizer    (:userId - numberSyncProd like 308)
app.get("/api/nonces/:userId", (req, res) => {
  try {
    axios.post("https://api.printful.com/embedded-designer/nonces", {"external_product_id": `${req.params.userId}`}, {headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.TOKEN_PRINTFUL}` }})
    .then((response) => {
      res.json(response.data);
      console.log(`START-customizer: get-NONCES`)
    })
  } catch (err) {console.log(err)}
});

// SAVE-IMAGE-TO-CLOUDINARY + delete old image/folder
app.get("/api/makeimagetocloudinary/:customer/:gtnumber/:new_old/:gtUrl", (req, res) => {
  try {
    let customer = req.params.customer;
    let gt = req.params.gtnumber;
    let new_old = req.params.new_old;
    let gtUrl = req.params.gtUrl;
    axios.get(`https://api.printful.com/mockup-generator/task?task_key=${gt}`, {headers: {Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }})
    .then( async (respImg) => {
      let mockups = respImg.data.result.mockups;
      let printfiles = respImg.data.result.printfiles;
      let createImageCloud = (mockups, printfiles) => {
        mockups.forEach((element, index) => {
          cloudinary.uploader.upload(element.mockup_url, {
            resource_type: "image",
            public_id: `customers/${req.params.customer}/${gt}/image-${index}`,
            overwrite: true,
            width: 700
          });
        });
        printfiles.forEach((element, index) => {
          cloudinary.uploader.upload(element.url, {
            resource_type: "image",
            public_id: `customers/${req.params.customer}/${gt}/image__printfiles-${index}`,
            overwrite: true,
            width: 1000
          });
        });
      }
      if (respImg.data.result.status == 'completed') {
        createImageCloud(mockups, printfiles);
        console.log(`CLOUDINARY: GT-COMPLETED-immediately: new-IMAGE/FOLDER-created`);
        // delete OLD product from cloudinary
        if (new_old == 'old' && gtUrl !== false) {
          cloudinary.api.delete_resources_by_prefix(`customers/${customer}/${gtUrl}`)
          .then(() => {
            cloudinary.api.delete_folder(`customers/${customer}/${gtUrl}`)
              .then((result) => {
                console.log(`CLOUDINARY: GT-COMPLETED-immediately: old-IMAGE/FOLDER-delete`)
                res.json(result);
              });
          })
        }
      } else if (respImg.data.result.status == 'pending') {
        console.log(`CLOUDINARY: GT-PENDING`)
        try {
          let resjson;
          let status = '';
          do {
            const res = await fetch(`https://api.printful.com/mockup-generator/task?task_key=${gt}`, {headers: {Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }});
            resjson = await res.json();
            status = resjson.result.status;
          } while (status == 'pending');
          // execute save
          if (status == 'completed') {
            let mockups = resjson.result.mockups;
            let printfiles = resjson.result.printfiles;
            // create NEW product on cloudinary
            createImageCloud(mockups, printfiles);
            console.log(`CLOUDINARY: GT-COMPLETED-delayed: new-IMAGE/FOLDER-created`);
            // delete OLD product from cloudinary
            if (new_old == 'old' && gtUrl !== false && gtUrl !== undefined) {
              await cloudinary.api.delete_resources_by_prefix(`customers/${customer}/${gtUrl}`)
              .then( async () => {
                await cloudinary.api.delete_folder(`customers/${customer}/${gtUrl}`)
                  .then((result) => {
                    console.log(`CLOUDINARY: GT-COMPLETED-delayed: old-IMAGE/FOLDER-delete`);
                    res.json(result);
                  });
              })
            }
          }
        } catch (err) {console.log(err)}
      }
    })
  } catch (err) {console.log(err)}
});

// TEMPLATE-create, MOCKUP-return-GT.
app.get("/api/template/:templateId/:external_product_id", async (req, res) => {
  if (req.params.templateId) {
    await axios.get(`https://api.printful.com/product-templates/${req.params.templateId}`, { headers: {Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID} })
    .then((resTemplates) => {
      axios.post(
        `https://api.printful.com/mockup-generator/create-task/${req.params.external_product_id}`, 
        { "variant_ids": resTemplates.data.result.available_variant_ids, "format": "jpg", "product_template_id": resTemplates.data.result.id },
        { headers: { 'Authorization': `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID } }
      )
      .then( async (respGt) => {
        if (respGt.data.result.status == 'completed') {
          console.log(`MOCKUP-created, GT-COMPLETED-immediately`);
          return res.json(respGt.data.result.task_key);
        } else {
          console.log(`MOCKUP-created, GT-PENDING`)
          try {
            // sending several queries in succession
            let gtResult = "";
            do {
              const res = await fetch(`https://api.printful.com/mockup-generator/task?task_key=${respGt.data.result.task_key}`, {headers: {Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }});
              resjson = await res.json();
              gtResult = await resjson.result.task_key;
            } while (resjson.result.status == 'completed');
            console.log(`MOCKUP-created, GT-COMPLETED-delayed`);  
            res.json(gtResult);
          } catch (err) {console.log(err)}
        }
        
      })
    }).catch(err => console.log(err))

  }
});

// IMAGE-PDP from TEMPLATE
app.get('/api/image/:prodId', async (req, res) => {
  if (req.params.prodId) {
    axios.get(`https://api.printful.com/product-templates/@${req.params.prodId}`, 
      {headers: {Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }}
    ).catch(function (error) {
        if (error.response.status === 404) {
          console.log(`ERROR-get-last-template`);
          axios.get(`https://api.printful.com/product-templates/`, {headers: {Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }})
            .then((resp) => { 
              console.log(`DPP create-IMAGE`, resp.data.result.items[0].mockup_file_url);
              res.send(resp.data.result.items[0].mockup_file_url) 
            }).catch(err => console.log(err))
        }
      })
      .then(() => {
        console.log(`ERROR-get-by-@`);
        axios.get(`https://api.printful.com/product-templates/@${req.params.prodId}`, {headers: {Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }})
          .then((resp) => { 
            console.log(`DPP create-IMAGE`, resp.data.result.mockup_file_url);
            res.send(resp.data.result.mockup_file_url) 
          }).catch(err => console.log(err))
      });
  }
});

// ORDER
app.post('/api/orderprintful', async (req, res) => {
  let arrBody = [];
  let printful = [];
  for(let [index, item] of req.body.line_items.entries()) {
    if (item.properties.length != 0 && item.properties[0].name == 'customize_detail_order' && item.properties[0].value != "") {
      try {
        let skuNumber = await item.sku.split('_')[1];
        const keyGt = item.properties[0].value;
        await axios.get(`https://api.printful.com/mockup-generator/task?task_key=${keyGt}`, {headers: { 'Authorization': `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }})
        .then( (response) => {
          arrBody.push({
            "variant_id": +`${skuNumber}`,
            "quantity": +`${req.body.line_items[index].quantity}`,
            "files": [
              {
                "placement": `${response.data.result.printfiles[0].placement}`,
                "url": `https://res.cloudinary.com/dqyorwnfk/image/upload/customers/${req.body.customer.id}/${keyGt}/image__printfiles-${0}.jpg`,
                "options": [
                  {
                    "id": "auto_thread_color",
                    "value": true
                  }
                ]
              }
            ]
          });

        })
      }
      catch (err) { console.log(err) }
    } else if (item.properties.length != 0) {
      try {
        await axios.get(`https://merch-link.myshopify.com/admin/products/${req.body.line_items[index].product_id}/metafields.json`, { headers: { 'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY }})
        .then( async (resp) => {
          for (let itemMeta of resp.data.metafields) {
            if (itemMeta.namespace == 'printful') {
              await axios.get(`https://api.printful.com/product-templates/@${itemMeta.value}`, { headers: { 'Authorization': `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }})
              .then( async (resp) => {
                arrBody.push({
                  "variant_id": +`${req.body.line_items[index].sku}`.split('_')[1],
                  "quantity": +`${req.body.line_items[index].quantity}`,
                  "product_template_id": +`${resp.data.result.id}`
                });
              })
            }
          }
        });
      } catch (err) { console.log(err) }
    }
  }
  
  for(let item of arrBody) {
    if (item.hasOwnProperty('files')) { printful.push(true) }
    else { printful.push(false) }
  }
  
  if (printful.includes(true)) {
    try{
      // const headers = { 'Authorization': `Bearer ${process.env.TOKEN_PRINTFUL}`, 'Content-Type': 'application/json', 'X-PF-Store-Id': `${process.env.STORE_ID}` };
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
      await axios.post(`https://api.printful.com/orders`, 
        body, 
        {headers: { 'Authorization': `Bearer ${process.env.TOKEN_PRINTFUL}`, 'Content-Type': 'application/json', 'X-PF-Store-ID': `${process.env.STORE_ID}` }}
      )
      .then( async () => {
        arrBody.length = 0;
        printful.length = 0;
        await axios.delete(`https://merch-link.myshopify.com/admin/api/2022-10/orders/${req.body.id}.json`, {headers: { 'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY }})
        .then(() => {
          axios.delete(`https://api.printful.com/orders/@${req.body.order_number}`, {headers: { 'Authorization': `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }})
        })
      });
    } catch (err) { console.log(err) }
  } else {
    console.log(`ORDER: no matching items`);
  }
  arrBody.length = 0;
  printful.length = 0;
});

// METAFIELDS created Shopify
app.post('/api/sendmetafield', (req, res) => {
  try {
    const customerId = req.body.metafield.namespace;
    axios.get(`https://merch-link.myshopify.com/admin/api/2022-07/customers/${customerId}/metafields.json`, { headers: { 'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY }})
    .then((response) => {
      let oldGtkey = req.body.metafield.oldgt;
      let currentMetafield = response.data.metafields[0]?response.data.metafields[0].value:'#My collection';
      let newMetafield = (oldGtkey == false) ? currentMetafield : currentMetafield.replace(`${oldGtkey},`, '');
      const headers = { 'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY, 'Content-Type': 'application/json' };
      const body = {
        "metafield": {
          "namespace": "customer_id",
          "key": "collection_name",
          "value": `${req.body.metafield.value},${newMetafield}`,
          "type": "single_line_text_field"
        }
      };
      try {
        axios.post(`https://merch-link.myshopify.com/admin/api/2022-07/customers/${customerId}/metafields.json`, body, { headers })
        .then((response) => {
          console.log(`METAFIELDS: create|update`);
          res.json(response.data);
        });
      } catch (err) { console.log(err) }
    });
  } catch (err) { console.log(err) }
});

// METAFIELDS & CLOUDINARY remove products
app.post('/api/changemetafield', (req, res) => {
  try {
    const customerId = req.body.customer_id;
    const product_template = req.body.product_template;
    const product_template_gt = req.body.product_template_gt;
    // get current data from metafield shopify
    axios.get(`https://merch-link.myshopify.com/admin/api/2022-07/customers/${customerId}/metafields.json`, { headers: { 'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY }})
    .then((response) => {
      // send update data to metafield shopify
      const existData = response.data.metafields[0]?response.data.metafields[0].value:'';
      const newData = existData.replace(`${product_template},`, '');
      const headers = { 'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY, 'Content-Type': 'application/json' };
      const body = {
        "metafield": {
          "namespace": "customer_id",
          "key": "collection_name",
          "value": `${newData}`,
          "type": "single_line_text_field"
        }
      };
      axios.post(`https://merch-link.myshopify.com/admin/api/2022-07/customers/${customerId}/metafields.json`, body, { headers });
      console.log(`METAFIELDS: remove-product`);
      // delete image & folder on cloudinary after delete product (x)
      if (customerId && product_template_gt !== 'undefined') {
        cloudinary.api.delete_resources_by_prefix(`customers/${customerId}/${product_template_gt}`)
          .then(() => {
            cloudinary.api.delete_folder(`customers/${customerId}/${product_template_gt}`)
            .then((result) => {
              console.log(`CLOUDINARY: remove-product`);
              res.json(result);
            });
          })
      }
    })
  } catch (err) { console.log(err) }
});

// METAFIELD name-collection
app.post('/api/namecoll', (req, res) => {
  try {
    const customerId = req.body.userid;
    const nameColl = req.body.newName;
    axios.get(`https://merch-link.myshopify.com/admin/api/2024-01/customers/${customerId}/metafields.json`, { headers: { 'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY }})
    .then((response) => {
      const existData = response.data.metafields[0]?response.data.metafields[0].value:'';
      const reg = /#(.*)/;
      const newData = existData.replace(reg, `#${nameColl}`);
      const headers = { 'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY, 'Content-Type': 'application/json' };
      // console.log();
      const body = {
        "metafield": {
          "namespace": "custom",
          "key": "collection_name",
          "value": `${newData}`,
          "type": "single_line_text_field"
        }
      };
      axios.post(`https://merch-link.myshopify.com/admin/api/2024-01/customers/${customerId}/metafields.json`, body, { headers })
      .then((response) => {
        res.json(response.data);
      }).catch(function (error) {console.log(error.toJSON())});
    }).catch(function (error) {console.log(error.toJSON())});
  } catch (err) { console.log(err) }
});

// METAFIELDS for public page
app.post('/api/publiccollection', (req, res) => {
  try {
    const headers = { 'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY, 'Content-Type': 'application/json'};
    const body = {
      "metafield": {
        "namespace": `${req.body.userid}`,
        "key": `${req.body.userid}`,
        "value": `${req.body.metaf}`,
        "type": "single_line_text_field"
      }
    };
    
    axios.post('https://merch-link.myshopify.com/admin/api/2022-10/metafields.json', body, { headers })
    .then(() => {
      const headers = { 'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY, 'Content-Type': 'application/json' };
      const body = {
        "metafield": {
          "namespace": `${req.body.userid}-image_coll`,
          "key": `${req.body.userid}-image_coll`,
          "value": `${req.body.imageLogoCatalogSrc}`,
          "type": "single_line_text_field"
        }
      };
      // console.log(body)
      axios.post('https://merch-link.myshopify.com/admin/api/2022-10/metafields.json', body, { headers })
      .then((response) => {
        res.json(response.data);
      });
    });
  } catch (err) {console.log(err)}
});

// LOGO collection save
app.post('/api/logocollection/:userId', (req, res) => {
  try {
    const headers = { 'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY, 'Content-Type': 'application/json' };
    const body = {
      "metafield": {
        "namespace": "custom",
        "key": "collection_image_base",
        "value": req.body.baseImage,
        "type": "single_line_text_field"
      }
    };
    axios.post(`https://merch-link.myshopify.com/admin/api/2022-07/customers/${req.params.userId}/metafields.json`, body, { headers })
      .then((response) => {
        res.json(response.data);
      });
  } catch (err) { console.log(err) }
});

// ERROR page
app.get('*', (req, res) => {
  res.status(500).json({ message: "error" })
});

app.listen(port);
module.exports = app;


// cloudinary = 1 gb;
// 1 image = 50kb;
// 1 prod = 5 img = 250kb;
// 1 user = 50 prod = 12500kb;
// 100 users = 5000 = 1250000kb = 1.25 GB

// 100 users - 50 prod - 5 img.