import express from 'express';
import payment from '../../controllers/paymentController.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

router.post('/create-payment-intent', authenticate, payment.createPaymentIntent);

// Stripe webhook (no auth; Stripe signs requests)
router.post('/webhook', express.json({ type: 'application/json' }), payment.handleWebhook);

export default router;

