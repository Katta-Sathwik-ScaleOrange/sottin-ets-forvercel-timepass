const Razorpay = require('razorpay');
const crypto = require('crypto');

let rzp;
try {
  rzp = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} catch (e) {
  console.warn('Razorpay not configured — payment features disabled');
}

exports.createRazorpayOrder = async (amountPaise) => {
  if (!rzp) throw new Error('Razorpay not configured');
  return rzp.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: `tt_${Date.now()}`,
  });
};

exports.verifyWebhookSignature = (body, signature) => {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  return expected === signature;
};
