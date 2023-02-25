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

app.get("/test", (req, res) => {
  res.json('gt-123');
});

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
  try {
    axios.get(`https://api.printful.com/product-templates/@${req.params.template}`, {headers: { Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }})
    .then(resp => {res.json(resp.data);});
  }
  catch (err) {console.log(err);}
});
// test get gt-data
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

// GT-IMAGE + save image
app.get('/api/gtkey/:gtkey', (req, res) => {
  if (req.params.gtkey !== "undefined") {
    try {
      axios.get(`https://api.printful.com/mockup-generator/task?task_key=${req.params.gtkey}`, {headers: { Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }})
      .then((resp) => {
        res.json(resp.data);
      });
    } catch (err) {console.log(err);}
  }
});

// NONCES open customizer
app.get("/api/nonces/:userId", (req, res) => {
  try {
    axios.post("https://api.printful.com/embedded-designer/nonces", {"external_product_id": `${req.params.userId}`}, {headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.TOKEN_PRINTFUL}` }})
    .then((response) => {
      res.json(response.data);
      console.log('START customizer: get nonces')
    })
  } catch (err) {console.log(err)}
});

// SAVE-IMAGE-TO-CLOUDINARY
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
            overwrite: true
          });
        });
        printfiles.forEach((element, index) => {
          cloudinary.uploader.upload(element.url, {
            resource_type: "image",
            public_id: `customers/${req.params.customer}/${gt}/image__printfiles-${index}`,
            overwrite: true
          });
        });
      }
      if (respImg.data.result.status == 'completed') {
        console.log(`GT immediately is completed`)
        createImageCloud(mockups, printfiles);
      } else if (respImg.data.result.status == 'pending') {
        console.log(`GT is pending`)

        try {

          // let testInterval = setInterval(async () => {
            // const res = await fetch(`https://api.printful.com/mockup-generator/task?task_key=${gt}`, {headers: {Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }});
            // resjson = await res.json();
            // if (resjson.result.status == 'completed') {
            //   console.log(`GT now is completed`)
            //   let mockups = resjson.result.mockups;
            //   let printfiles = resjson.result.printfiles;
            //   createImageCloud(mockups, printfiles);
            //   clearInterval(testInterval);
            //   console.log('GT is Retrieved')
            // } else {console.log('awaiting ...')}
          // }, 11000)

          // sending several queries in succession
          // let gtResult = "";
          do {
            // const res = await fetch(`https://api.printful.com/mockup-generator/task?task_key=${respGt.data.result.task_key}`, {headers: {Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }});
            // resjson = await res.json();
            // gtResult = await resjson.result.task_key;
            const res = await fetch(`https://api.printful.com/mockup-generator/task?task_key=${gt}`, {headers: {Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }});
            resjson = await res.json();
            console.log(`GT now is completed`)

            let mockups = resjson.result.mockups;
            let printfiles = resjson.result.printfiles;
            createImageCloud(mockups, printfiles);
            // clearInterval(testInterval);
            console.log('GT is Retrieved')
          } while (resjson.result.status == 'completed');
          console.log('GT is Retrieved')
          // res.json(gtResult);

          // let testInterval = setInterval(async () => {
          //   const res = await fetch(`https://api.printful.com/mockup-generator/task?task_key=${gt}`, {headers: {Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }});
          //   resjson = await res.json();
          //   if (resjson.result.status == 'completed') {
          //     console.log(`GT now is completed`)
          //     let mockups = resjson.result.mockups;
          //     let printfiles = resjson.result.printfiles;
          //     createImageCloud(mockups, printfiles);
          //     clearInterval(testInterval);
          //     console.log('GT is Retrieved')
          //   } else {console.log('awaiting ...')}
          // }, 11000)

        } catch (err) {console.log(err)}
      }
    }).then(() => { 
      res.json(gt);
      // delete old image-folder on cloudinary if product update
      if (new_old == "new") {
        console.log(`NEW nothing to DELETE on cloudinary`);
      } else if (new_old == 'old' && gtUrl !== false) {
        cloudinary.api.delete_resources_by_prefix(`customers/${customer}/${gtUrl}`)
        .then(() => {
          console.log(`rewrite PRODUCT delete OLD-IMAGE cloud...`)
          cloudinary.api.delete_folder(`customers/${customer}/${gtUrl}`)
            .then((result) => {
              console.log(`rewrite PRODUCT delete OLD-FOLDER cloud...`)
              res.json(result);
            });
        })
      }
    });
  } catch (err) {console.log(err)}
});

// 1. get TEMPLATE, create MOCKUP return GT
app.get("/api/template/:templateId/:customer", (req, res) => {
  if (req.params.templateId) {
    try {
      axios.get(`https://api.printful.com/product-templates/@${req.params.templateId}`, { headers: {Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`} })
      .then((resTemplates) => {
        axios.post(
          `https://api.printful.com/mockup-generator/create-task/${req.params.templateId}`, 
          { "variant_ids": resTemplates.data.result.available_variant_ids, "format": "jpg", "product_template_id": resTemplates.data.result.id },
          { headers: { 'Authorization': `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID } }
        )
        .then(async (respGt) => {
          if (respGt.data.result.status == 'completed') {
            console.log(`MOCKUP is created, GT YES-completed - ${respGt.data.result.task_key}`)
            return res.json(respGt.data.result.task_key);
          } else {
            console.log(`MOCKUP is created, GT NO-completed - ${respGt.data.result.task_key}`)
            try {
              // sending several queries in succession
              let gtResult = "";
              do {
                const res = await fetch(`https://api.printful.com/mockup-generator/task?task_key=${respGt.data.result.task_key}`, {headers: {Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }});
                resjson = await res.json();
                gtResult = await resjson.result.task_key;
              } while (resjson.result.status == 'completed');
              console.log(`MOCKUP is created, GT return YES-COMPLETED: ${gtResult}`)
              res.json(gtResult);
            } catch (err) {console.log(err)}
          }
        })
      })
    } catch (err) {console.log(err) }
  }
});

// 2. Get IMAGE for PDP from TEMPLATE
app.get('/api/image/:prodId', (req, res) => {
  if (req.params.prodId) {
    try {
      axios.get(`https://api.printful.com/product-templates/@${req.params.prodId}`, {headers: {Authorization: `Bearer ${process.env.TOKEN_PRINTFUL}`}})
      .then((resp) => { 
        console.log(`IMAGE for DPP from template ${req.params.prodId}`);
        res.json(resp.data) 
      });
    } catch (err) { console.log(err) }
  }
});

// ORDER
app.post('/api/orderprintful', async (req, res) => {
  let arrBody = [];
  let printful = [];
  for(let [index, item] of req.body.line_items.entries()) {
    if (item.properties[0].name == 'customize_detail_order' && item.properties[0].value != "") {
      try {
        const keyGt = item.properties[0].value;
        await axios.get(`https://api.printful.com/mockup-generator/task?task_key=${keyGt}`, {headers: { 'Authorization': `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }})
        .then(response => {
          arrBody.push({
            "to_printful": true,
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
      catch (err) { console.log(err) }
    } else {
      try {
        await axios.get(`https://all-u-sportswear.myshopify.com/admin/products/${req.body.line_items[index].product_id}/metafields.json`, { headers: { 'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY }})
        .then( async (resp) => {
          await axios.get(`https://api.printful.com/product-templates/@${resp.data.metafields[0].value}`, { headers: { 'Authorization': `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }})
          .then( async (resp) => {
            arrBody.push({
              "variant_id": +`${req.body.line_items[index].sku}`.split('_')[1],
              "quantity": +`${req.body.line_items[index].quantity}`,
              "product_template_id": +`${resp.data.result.id}`
            });
          })
        });
      }
      catch (err) { console.log(err) }
    }
  }

  for(let item of arrBody) {
    if (item.hasOwnProperty('to_printful')) {
      printful.push(true);
    }else {
      printful.push(false);
    }
  }

  if (printful.includes(true)) {
    try{
      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID };
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
      await axios.post("https://api.printful.com/orders", body, { headers })
      .then(async () => {
        arrBody.length = 0;
        printful.length = 0;
        await axios.delete(`https://all-u-sportswear.myshopify.com/admin/api/2022-10/orders/${req.body.id}.json`, {headers: { 'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY }})
        await axios.delete(`https://api.printful.com/orders/@${req.body.order_number}`, {headers: { 'Authorization': `Bearer ${process.env.TOKEN_PRINTFUL}`, 'X-PF-Store-ID': process.env.STORE_ID }})
      });
    } catch (err) { console.log(err) }
  }
  arrBody.length = 0;
  printful.length = 0;
});

// METAFIELDS created for Shopify   // https://all-u-sportswear.myshopify.com/admin/api/2022-07/customers/6341351670004/metafields.json
app.post('/api/sendmetafield', (req, res) => {
  try {
    const customerId = req.body.metafield.namespace;
    axios.get(`https://all-u-sportswear.myshopify.com/admin/api/2022-07/customers/${customerId}/metafields.json`, { headers: { 'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY }})
    .then((response) => {
      console.log("NEW or OLD product: " + req.body.metafield.oldgt);
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
        axios.post(`https://all-u-sportswear.myshopify.com/admin/api/2022-07/customers/${customerId}/metafields.json`, body, { headers })
        .then((response) => {
          res.json(response.data);
        });
      } catch (err) { console.log(err) }
    });
  } catch (err) { console.log(err) }
});

// METAFIELDS remove products: REMOVE-CHANGE product METAFIELD-shopify & CLOUDINARY image-folder
app.post('/api/changemetafield', (req, res) => {
  try {
    const customerId = req.body.customer_id;
    const product_template = req.body.product_template;
    const product_template_gt = req.body.product_template_gt;
    // get current data from metafield shopify
    axios.get(`https://all-u-sportswear.myshopify.com/admin/api/2022-07/customers/${customerId}/metafields.json`, { headers: { 'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY }})
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
      axios.post(`https://all-u-sportswear.myshopify.com/admin/api/2022-07/customers/${customerId}/metafields.json`, body, { headers });
      // delete image & folder on cloudinary after delete product (x)
      if (customerId && product_template_gt !== 'undefined') {
        cloudinary.api.delete_resources_by_prefix(`customers/${customerId}/${product_template_gt}`)
          .then(() => {
            console.log(`delete PRODUCT -> IMAGE cloudinary`)
            cloudinary.api.delete_folder(`customers/${customerId}/${product_template_gt}`)
            .then((result) => {
              console.log(`delete PRODUCT -> FOLDER cloudinary`)
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
    axios.get(`https://all-u-sportswear.myshopify.com/admin/api/2022-07/customers/${customerId}/metafields.json`, { headers: { 'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY}})
    .then((response) => {
      const existData = response.data.metafields[0]?response.data.metafields[0].value:'';
      const reg = /#(.*)/;
      const newData = existData.replace(reg, `#${nameColl}`);
      const headers = { 'X-Shopify-Access-Token': process.env.ACCESS_TOKEN_SHOPIFY, 'Content-Type': 'application/json' };
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
    axios.post('https://all-u-sportswear.myshopify.com/admin/api/2022-10/metafields.json', body, { headers })
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
      axios.post('https://all-u-sportswear.myshopify.com/admin/api/2022-10/metafields.json', body, { headers })
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
    axios.post(`https://all-u-sportswear.myshopify.com/admin/api/2022-07/customers/${req.params.userId}/metafields.json`, body, { headers })
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