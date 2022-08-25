// For a fully working example, please see:
// https://github.com/paypal-examples/docs-examples/tree/main/standard-integration

import "dotenv/config"; // loads variables from .env file
import express from "express";
import fetch from "node-fetch";
import shortid from 'shortid';
import bodyParser from 'body-parser';
import {v4 as uuidv4} from 'uuid';

const { CLIENT_ID, APP_SECRET } = process.env;
const app = express();
const port = 3000;
const base = "https://api-m.sandbox.paypal.com";

const customerId = uuidv4().substring(0, 8);

app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(bodyParser.json());

app.get("/", async (req, res) => {

  const accessToken = await generateAccessToken();
  const url = `${base}/v1/identity/generate-token`;
  const response = await fetch(url, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      customer_id: customerId
    }),
  });

  const tokenObj = await getPaymentTokens();
  const payment_tokens = tokenObj.payment_tokens ?? [];

  const responseJson = await response.json();

  const clientToken = responseJson.client_token;
  const clientId = CLIENT_ID;

  res.render("checkout", {clientId, clientToken, customerId, payment_tokens});

});

// create a new order
app.post("/api/orders/:amount", async (req, res) => {
  const order = await createOrder(req.params.amount);
  res.json(order);
});

// capture payment & store order information or fullfill order
app.post("/api/orders/:orderID/capture", async (req, res) => {
  const { orderID } = req.params;
  const captureData = await capturePayment(orderID);
  // TODO: store payment information such as the transaction ID
  res.json(captureData);
});

app.get("/api/payment-tokens", async (req, res) => {
  const data = await getPaymentTokens();
  res.json(data);
})

app.post("/api/payment-tokens/:customerID/delete", async(req, res) => {
  const { customerID } = req.params;
  const ret = await deletePaymentTokens(customerID);
  res.json(ret);
})

app.get("/api/payment-tokens/:paymentToken/info", async (req, res) => {
  const { paymentToken } = req.params;
  const ret = await getPaymentTokenInfo(paymentToken);
  res.json(ret);
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});


//////////////////////
// PayPal API helpers
//////////////////////

async function getPaymentTokens(customer_id) {
  const accessToken = await generateAccessToken();
  const response = await fetch(`https://api-m.sandbox.paypal.com/v2/vault/payment-tokens?customer_id=${customer_id}`, {
    method: "get",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    }
  });
  const data = await response.json();
  return data;
}

async function getPaymentTokenInfo(payment_token) {
  const accessToken = await generateAccessToken();
  const response = await fetch(`https://api-m.sandbox.paypal.com/v2/vault/payment-tokens/${payment_token}`, {
    method: "get",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    }
  });
  const data = await response.json();
  return data;
}

// use the orders api to create an order
async function createOrder(amount) {
  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders`;
  const response = await fetch(url, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "PayPal-Request-Id": uuidv4() // ADD THIS ATTRIBUTE FOR VAULTING
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "EUR",
            value: amount,
          },
        },
      ],
      application_context: { //THESE ARE NEEDED FOR VAULTING AS WELL!
       return_url: "https://example.com/return",
       cancel_url: "https://example.com/cancel"
      },
      payment_source: { //AND ALL THIS!
        paypal: {
          attributes: {
            customer: {
              id: customerId, //your customer id :)
            },
            vault: {
              confirm_payment_token: "ON_ORDER_COMPLETION",
              customer_type: "CONSUMER",
              usage_type: "MERCHANT"
            }
          }
        }
      }
    }),
  });
  const data = await response.json();
  return data;
}

// use the orders api to capture payment for an order
async function capturePayment(orderId) {
  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders/${orderId}/capture`;
  const response = await fetch(url, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();
  return data;
}

async function deletePaymentTokens(customer_id) {
  const accessToken = await generateAccessToken();

  const tokenObj = await getPaymentTokens(customer_id);

  const promises = tokenObj.payment_tokens.map(token => {
    const deleteUrl = token.links[1].href;
    if(token.status === "CREATED") {
      return fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      })
    }
  })

  const result = await Promise.all(promises);
}

// use the orders api to capture payment for an order
async function getOrderDetails(orderId) {
  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders/${orderId}`;
  const response = await fetch(url, {
    method: "get",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();
  return data;
}

// generate an access token using client id and app secret
async function generateAccessToken() {
  const auth = Buffer.from(CLIENT_ID + ":" + APP_SECRET).toString("base64")
  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: "post",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });
  const data = await response.json();
  return data.access_token;
}
