import axios from 'axios';

function openRazorpayPopup(payment) {
  return new Promise((resolve) => {
    const razorpayPopup = new window.Razorpay({
      key: payment.keyId,
      order_id: payment.razorpayOrderId,
      amount: payment.amountCents,
      currency: payment.currency,
      name: 'CartNest',
      handler: (paymentDetails) => resolve(paymentDetails),
      modal: {
        ondismiss: () => resolve(null),
      }
    });
    razorpayPopup.open();
  })
}

export async function payForOrder(orderId) {
  const razorpayDetails = await axios.post(`/api/orders/${orderId}/payment/`);
  const paymentDetails = await openRazorpayPopup(razorpayDetails.data);
  if (paymentDetails === null) return false;
  await axios.post(`/api/orders/${orderId}/payment/verify/`, paymentDetails);
  return true;
}
