import express from 'express';
import payment from '../../controllers/paymentController.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

router.post('/create-payment-intent', authenticate, payment.createPaymentIntent);

// Webhook is registered in server.js with express.raw() for signature verification

export default router;

