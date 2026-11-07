import axios from 'axios';
const U = '11111111-2222-3333-4444-555555555555';
let calls, verifyStatus, options;
axios.defaults.adapter = async (config) => {
  calls.push(`${config.method.toUpperCase()} ${config.url}` + (config.data ? ` body=${config.data}` : ''));
  const respond = (status, data) => {
    const res = { data, status, statusText: '', headers: {}, config };
    if (status >= 400) { const e = new axios.AxiosError(`status ${status}`, 'ERR_BAD_RESPONSE', config, null, res); throw e; }
    return res;
  };
  if (config.url === `/api/orders/${U}/payment/`) return respond(200, { keyId: 'rzp_test_fake', razorpayOrderId: 'order_fake', amountCents: 2200, currency: 'INR' });
  if (config.url === `/api/orders/${U}/payment/verify/`) return respond(verifyStatus, { status: 'confirmed' });
  return respond(404, { detail: 'Not found.' });
};
globalThis.window = { Razorpay: function (o) { options = o; this.open = () => this; } };
const { payForOrder } = await import(process.argv[2]);

async function run(label, ending, status = 200) {
  calls = []; options = undefined; verifyStatus = status;
  const pending = payForOrder(U).then((v) => `returned ${v}`, (e) => `threw (${e.message})`);
  await new Promise((r) => setTimeout(r, 20));
  if (options) {
    if (ending === 'pay') options.handler({ razorpay_payment_id: 'pay_1', razorpay_order_id: 'order_fake', razorpay_signature: 'ab'.repeat(32) });
    if (ending === 'close') options.modal.ondismiss();
  }
  const outcome = await Promise.race([pending, new Promise((r) => setTimeout(() => r('still waiting'), 200))]);
  console.log(`--- ${label}: ${outcome}`);
  console.log('   popup settings:', options ? JSON.stringify({ key: options.key, order_id: options.order_id, amount: options.amount, currency: options.currency }) : 'popup never opened');
  for (const c of calls) console.log('   ', c);
}
await run('customer pays, verify accepted', 'pay');
await run('customer closes the popup', 'close');
await run('customer pays, verify fails (400)', 'pay', 400);
