const express = require('express');
const router = express.Router();
const stripe = require('stripe')('your_stripe_secret_key');
const Payment = require('../models/Payment');

// Create payment intent
router.post('/create-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd', metadata } = req.body;
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Confirm payment
router.post('/confirm', async (req, res) => {
  try {
    const { paymentId, stripePaymentId, status } = req.body;
    
    // Update payment in database
    const payment = await Payment.findByIdAndUpdate(paymentId, {
      status,
      stripePaymentId,
      paidAt: new Date()
    }, { new: true });
    
    // Generate receipt URL
    const receiptUrl = `https://dashboard.stripe.com/payments/${stripePaymentId}`;
    
    res.json({ success: true, payment, receiptUrl });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get payments for user
router.get('/', async (req, res) => {
  try {
    const payments = await Payment.find({ homeowner: req.user.id })
      .populate('project')
      .sort({ createdAt: -1 });
      
    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;