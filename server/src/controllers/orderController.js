import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import AuditLog from '../models/AuditLog.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';

export const createOrder = async (req, res, next) => {
    // Helper to build order data without transactions (standalone MongoDB fallback)
    const buildOrder = async (items, shippingAddress, billingAddress, payment, user, sessionOpt) => {
        const orderItems = [];
        let subtotal = 0;
        const opts = sessionOpt ? { new: true, session: sessionOpt } : { new: true };

        for (const item of items) {
            const product = await Product.findOneAndUpdate(
                { _id: item.product, 'inventory.quantity': { $gte: item.quantity }, status: 'active' },
                { $inc: { 'inventory.quantity': -item.quantity, 'inventory.reserved': item.quantity } },
                opts
            );
            if (!product) {
                throw new ConflictError(`Product ${item.product} unavailable or insufficient stock`);
            }
            const itemTotal = product.price * item.quantity;
            orderItems.push({ product: product._id, name: product.name, sku: product.sku, quantity: item.quantity, price: product.price, total: itemTotal });
            subtotal += itemTotal;
        }

        const tax = subtotal * 0.1;
        const shipping = subtotal > 100 ? 0 : 9.99;
        const total = subtotal + tax + shipping;

        const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const orderData = {
            orderNumber,
            customer: user._id, tenantId: user.tenantId, items: orderItems,
            subtotal, tax, shipping, total, shippingAddress,
            billingAddress: billingAddress || shippingAddress,
            payment: { method: payment?.method || 'stripe' },
            inventoryLocked: true,
            inventoryLockExpires: new Date(Date.now() + 30 * 60 * 1000),
            statusHistory: [{ status: 'pending', note: 'Order created' }],
        };

        return orderData;
    };

    const { items, shippingAddress, billingAddress, payment } = req.body;

    // Try with transaction first (replica set / Atlas), fall back to non-transactional (standalone)
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();

        const orderData = await buildOrder(items, shippingAddress, billingAddress, payment, req.user, session);
        const order = await Order.create([orderData], { session });

        await session.commitTransaction();
        session.endSession();
        return res.status(201).json({ success: true, data: { order: order[0] } });
    } catch (txError) {
        // Abort transaction if it was started
        if (session?.inTransaction()) {
            try { await session.abortTransaction(); } catch (_) { /* ignore */ }
        }
        if (session) {
            try { session.endSession(); } catch (_) { /* ignore */ }
        }

        // If error is because transactions aren't supported, fall back to non-transactional
        const isTxUnsupported = txError.message?.includes('Transaction numbers are only allowed on a replica set')
            || txError.codeName === 'IllegalOperation';

        if (!isTxUnsupported) {
            return next(txError);
        }

        // Fallback: create order without transaction (standalone MongoDB)
        try {
            const orderData = await buildOrder(items, shippingAddress, billingAddress, payment, req.user, null);
            const order = await Order.create(orderData);
            return res.status(201).json({ success: true, data: { order } });
        } catch (fallbackError) {
            return next(fallbackError);
        }
    }
};

export const getOrders = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status, sort = '-createdAt' } = req.query;
        const query = {};
        const tenantId = req.user.tenantId && (req.user.tenantId._id || req.user.tenantId);

        if (req.user.role === 'superadmin') {
            // Super aadmin sees all orders in the system
        } else if (req.user.role === 'admin') {
            // Admin sees all orders in their tenant, plus generic unassigned orders
            if (tenantId) {
                query.$or = [{ tenantId }, { tenantId: null }, { tenantId: { $exists: false } }];
            }
        } else {
            // Regular users see only their own orders
            query.customer = req.user._id;
        }
        if (status) query.status = status;

        const orders = await Order.find(query).populate('customer', 'name email')
            .sort(sort).skip((page - 1) * limit).limit(parseInt(limit));
        const total = await Order.countDocuments(query);

        res.status(200).json({ success: true, data: { orders, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } } });
    } catch (error) { next(error); }
};

export const getOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id).populate('customer', 'name email').populate('items.product', 'name images slug');
        if (!order) throw new NotFoundError('Order');
        if (order.customer._id.toString() !== req.user._id.toString() && !['admin', 'superadmin'].includes(req.user.role)) throw new NotFoundError('Order');
        res.status(200).json({ success: true, data: { order } });
    } catch (error) { next(error); }
};

export const updateOrderStatus = async (req, res, next) => {
    try {
        const { status, note } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) throw new NotFoundError('Order');

        const valid = { pending: ['confirmed', 'canceled'], confirmed: ['processing', 'canceled'], processing: ['shipped', 'canceled'], shipped: ['delivered'], delivered: ['returned'], canceled: [], returned: [] };
        if (!valid[order.status]?.includes(status)) throw new ValidationError(`Cannot transition from '${order.status}' to '${status}'`);

        order.status = status;
        order.statusHistory.push({ status, changedBy: req.user._id, note });

        if (status === 'canceled') {
            for (const item of order.items) {
                await Product.findByIdAndUpdate(item.product, { $inc: { 'inventory.quantity': item.quantity, 'inventory.reserved': -item.quantity } });
            }
            order.inventoryLocked = false;
        }
        if (status === 'delivered') {
            for (const item of order.items) {
                await Product.findByIdAndUpdate(item.product, { $inc: { 'inventory.reserved': -item.quantity } });
            }
            order.inventoryLocked = false;
        }

        await order.save();
        res.status(200).json({ success: true, data: { order } });
    } catch (error) { next(error); }
};

export const cancelOrder = async (req, res, next) => {
    req.body.status = 'canceled';
    req.body.note = req.body.reason || 'Canceled by user';
    return updateOrderStatus(req, res, next);
};

export default {
    createOrder,
    getOrders,
    getOrder,
    updateOrderStatus,
    cancelOrder,
};
