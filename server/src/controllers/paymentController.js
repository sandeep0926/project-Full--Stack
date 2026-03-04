import Order from '../models/Order.js';
import { stripe } from '../config/stripe.js';
import { AuthenticationError, NotFoundError, ValidationError } from '../utils/errors.js';
import logger from '../utils/logger.js';

const createPaymentIntent = async (req, res, next) => {
    try {
        const { orderId } = req.body;
        if (!orderId) {
            throw new ValidationError('orderId is required');
        }
        if (!req.user) {
            throw new AuthenticationError('Please login first');
        }

        const query = {
            _id: orderId,
            customer: req.user._id,
        };
        if (req.user.tenantId) {
            query.tenantId = req.user.tenantId;
        } else {
            query.$or = [{ tenantId: null }, { tenantId: { $exists: false } }];
        }

        const order = await Order.findOne(query);

        if (!order) {
            throw new NotFoundError('Order');
        }

        if (order.payment.status === 'paid') {
            return res.status(200).json({
                success: true,
                data: { status: 'already_paid' },
            });
        }

        const amount = Math.round(order.total * 100);

        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: process.env.STRIPE_CURRENCY || 'usd',
            automatic_payment_methods: { enabled: true },
            metadata: {
                orderId: String(order._id),
                tenantId: String(order.tenantId),
                customerId: String(order.customer),
            },
        });

        order.payment.stripePaymentIntentId = paymentIntent.id;
        order.payment.status = 'processing';
        await order.save();

        res.status(201).json({
            success: true,
            data: {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
            },
        });
    } catch (error) {
        next(error);
    }
};

const handleWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const rawBody = req.body; // Buffer when route uses express.raw()
    let event;
    if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
        try {
            event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
        } catch (err) {
            logger.error(`Stripe webhook signature verification failed: ${err.message}`);
            return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
        }
    } else {
        event = typeof rawBody === 'object' && !Buffer.isBuffer(rawBody) ? rawBody : JSON.parse(rawBody.toString());
    }

    try {
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const pi = event.data.object;
                const order = await Order.findOne({
                    'payment.stripePaymentIntentId': pi.id,
                });
                if (order) {
                    order.payment.status = 'paid';
                    order.payment.paidAt = new Date();
                    order.status = 'confirmed';
                    order.statusHistory.push({
                        status: 'confirmed',
                        note: 'Payment succeeded',
                    });
                    await order.save();
                }
                break;
            }
            case 'payment_intent.payment_failed': {
                const pi = event.data.object;
                const order = await Order.findOne({
                    'payment.stripePaymentIntentId': pi.id,
                });
                if (order) {
                    order.payment.status = 'failed';
                    order.statusHistory.push({
                        status: order.status,
                        note: 'Payment failed',
                    });
                    await order.save();
                }
                break;
            }
            default:
                break;
        }
    } catch (err) {
        logger.error(`Stripe webhook error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    res.json({ received: true });
};

export default {
    createPaymentIntent,
    handleWebhook,
};

