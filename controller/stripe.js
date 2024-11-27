const Stripe = require("stripe");
require("dotenv").config();
const stripe = Stripe(process.env.STRIPE_LIVE);

const paymentController = async (req, res) => {
  try {
    let customerId;

    console.log("req.ody", req.body)

    // Get the customer whose email matches the one sent by the client
    const customerList = await stripe.customers.list({
      email: req.body.email,
      limit: 1,
    });

    // Check if the customer exists, if not create a new customer
    if (customerList.data.length !== 0) {
      customerId = customerList.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: req.body.email,
      });
      customerId = customer.id; // Fixed this line
    }

    // Create a temporary secret key linked with the customer
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: "2023-10-16" }
    );
    // Create new payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: req.body.amount,
      description: "Your payment description here",
      currency: "eur",
      customer: customerId,

      automatic_payment_methods: {
        enabled: true,
      },
      setup_future_usage: 'off_session', // or 'on_session'
    });

    console.log(paymentIntent)

    res.json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      paymetID:paymentIntent.payment_method_configuration_details.id,
      customer: customerId,
      amount: paymentIntent.amount
    });
  } catch (e) {
    res.status(400).json({
      error: e.message,
    });
  }
};

module.exports = { paymentController };
