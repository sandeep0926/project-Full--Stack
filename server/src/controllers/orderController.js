const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const { NotFoundError, ValidationError, ConflictError } = require('../utils/errors');

exports.createOrder = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { items, shippingAddress, billingAddress, payment } = req.body;
        const orderItems = [];
        let subtotal = 0;

        for (const item of items) {
            const product = await Product.findOneAndUpdate(
                { _id: item.product, 'inventory.quantity': { $gte: item.quantity }, status: 'active' },
                { $inc: { 'inventory.quantity': -item.quantity, 'inventory.reserved': item.quantity } },
                { new: true, session }
            );
            if (!product) {
                await session.abortTransaction();
                throw new ConflictError(`Product ${item.product} unavailable or insufficient stock`);
            }
            const itemTotal = product.price * item.quantity;
            orderItems.push({ product: product._id, name: product.name, sku: product.sku, quantity: item.quantity, price: product.price, total: itemTotal });
            subtotal += itemTotal;
        }

        const tax = subtotal * 0.1;
        const shipping = subtotal > 100 ? 0 : 9.99;
        const total = subtotal + tax + shipping;

        const order = await Order.create([{
            customer: req.user._id, tenantId: req.user.tenantId, items: orderItems,
            subtotal, tax, shipping, total, shippingAddress,
            billingAddress: billingAddress || shippingAddress,
            payment: { method: payment?.method || 'stripe' },
            inventoryLocked: true,
            inventoryLockExpires: new Date(Date.now() + 30 * 60 * 1000),
            statusHistory: [{ status: 'pending', note: 'Order created' }],
        }], { session });

        await session.commitTransaction();
        res.status(201).json({ success: true, data: { order: order[0] } });
    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};

exports.getOrders = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status, sort = '-createdAt' } = req.query;
        const query = { customer: req.user._id };
        if (status) query.status = status;
        if (['admin', 'superadmin'].includes(req.user.role)) delete query.customer;

        const orders = await Order.find(query).populate('customer', 'name email')
            .sort(sort).skip((page - 1) * limit).limit(parseInt(limit));
        const total = await Order.countDocuments(query);

        res.status(200).json({ success: true, data: { orders, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } } });
    } catch (error) { next(error); }
};

exports.getOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id).populate('customer', 'name email').populate('items.product', 'name images slug');
        if (!order) throw new NotFoundError('Order');
        if (order.customer._id.toString() !== req.user._id.toString() && !['admin', 'superadmin'].includes(req.user.role)) throw new NotFoundError('Order');
        res.status(200).json({ success: true, data: { order } });
    } catch (error) { next(error); }
};

exports.updateOrderStatus = async (req, res, next) => {
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

exports.cancelOrder = async (req, res, next) => {
    req.body.status = 'canceled';
    req.body.note = req.body.reason || 'Canceled by user';
    return exports.updateOrderStatus(req, res, next);
};
