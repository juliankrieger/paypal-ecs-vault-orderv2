import { getValueInput } from "./util.mjs";

export function setupBtns() {
    paypal.Buttons({
        fundingSource: paypal.FUNDING.PAYPAL,
        // Order is created on the server and the order id is returned
        createOrder: async (data, actions) => {
          const res = await fetch(`/api/orders/${getValueInput()}`, {
            method: "post",
            // use the "body" param to optionally pass additional order information
            // like product ids or amount
          });

          const order = await res.json();
          console.log("create order data");
          console.dir(order);
          return order.id;
        },
        // Finalize the transaction on the server after payer approval
        onApprove: async (data, actions) => {

          const res = await fetch(`/api/orders/${data.orderID}/capture`, {
            method: "post",
            // use the "body" param to optionally pass additional order information
            // like product ids or amount
          });

          const resJson = await res.json();
          console.log("capture order data");
          console.dir(resJson);

          const token = resJson?.payment_source?.paypal?.attributes?.vault?.id;
          if(!token) {
            console.error("Vaulting unsuccessful");
          }
          
          document.getElementById("payment-tokens")
            .insertAdjacentHTML('beforeend', `<li class="valid-token" data-token=${token}>${token}</li>`);
          
          const tokenInfo = await fetch(`/api/payment-tokens/${token}/info`, {
            method: "GET"
          });

          const tokenData = await tokenInfo.json();
          console.log("token data")
          console.dir(tokenData);
          if(tokenData) {
            document.getElementById("original-customer-id").innerText = tokenData.customer_id;
            document.getElementById("delete-payment-token").disabled = false;
            document.getElementById("delete-payment-token").setAttribute("data-delete-for-id", tokenData.customer_id);
          }

        }
      }).render('#paypal-button-container');


      document.getElementById("delete-payment-token").addEventListener("click", async function (event) {
        event.preventDefault();
        const customer_id = this.getAttribute("data-delete-for-id");
        const res = await fetch(`/api/payment-tokens/${customer_id}/delete`, {
          method: "POST"
        });
        console.log(res);
      })
}