const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const { cacheGet, cacheSet, cacheDel, cacheFlushPattern } = require('../config/redis');
const { NotFoundError, ValidationError } = require('../utils/errors');

// @desc Create product
// @route POST /api/v1/products
exports.createProduct = async (req, res, next) => {
    try {
        const slug = req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const product = await Product.create({
            ...req.body,
            slug,
            tenantId: req.user.tenantId,
            createdBy: req.user._id,
        });

        await AuditLog.logAction({
            user: req.user._id,
            tenantId: req.user.tenantId,
            action: 'PRODUCT_CREATE',
            category: 'ecommerce',
            description: `Product "${product.name}" created`,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            resourceType: 'product',
            resourceId: product._id,
        });

        await cacheFlushPattern('products:*');

        res.status(201).json({
            success: true,
            data: { product },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Get all products
// @route GET /api/v1/products
exports.getProducts = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            sort = '-createdAt',
            search,
            category,
            minPrice,
            maxPrice,
            status = 'active',
            brand,
        } = req.query;

        const cacheKey = `products:${JSON.stringify(req.query)}:${req.user?.tenantId || 'public'}`;
        const cached = await cacheGet(cacheKey);
        if (cached) {
            return res.status(200).json({ success: true, data: cached });
        }

        const query = { status };

        if (req.tenantFilter) {
            Object.assign(query, req.tenantFilter);
        }

        if (search) {
            query.$text = { $search: search };
        }
        if (category) query.category = category;
        if (brand) query.brand = brand;
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        const products = await Product.find(query)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        const total = await Product.countDocuments(query);

        const result = {
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        };

        await cacheSet(cacheKey, result, 120);

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

// @desc Get single product
// @route GET /api/v1/products/:id
exports.getProduct = async (req, res, next) => {
    try {
        const cacheKey = `product:${req.params.id}`;
        let product = await cacheGet(cacheKey);

        if (!product) {
            product = await Product.findById(req.params.id).lean();
            if (!product) throw new NotFoundError('Product');
            await cacheSet(cacheKey, product, 300);
        }

        res.status(200).json({
            success: true,
            data: { product },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Update product
// @route PUT /api/v1/products/:id
exports.updateProduct = async (req, res, next) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!product) throw new NotFoundError('Product');

        await cacheDel(`product:${product._id}`);
        await cacheFlushPattern('products:*');

        await AuditLog.logAction({
            user: req.user._id,
            tenantId: req.user.tenantId,
            action: 'PRODUCT_UPDATE',
            category: 'ecommerce',
            description: `Product "${product.name}" updated`,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            resourceType: 'product',
            resourceId: product._id,
        });

        res.status(200).json({
            success: true,
            data: { product },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Delete product
// @route DELETE /api/v1/products/:id
exports.deleteProduct = async (req, res, next) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { status: 'archived', isPublished: false },
            { new: true }
        );

        if (!product) throw new NotFoundError('Product');

        await cacheDel(`product:${product._id}`);
        await cacheFlushPattern('products:*');

        await AuditLog.logAction({
            user: req.user._id,
            tenantId: req.user.tenantId,
            action: 'PRODUCT_DELETE',
            category: 'ecommerce',
            description: `Product "${product.name}" archived`,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            resourceType: 'product',
            resourceId: product._id,
        });

        res.status(200).json({
            success: true,
            data: { message: 'Product archived' },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Get product categories
// @route GET /api/v1/products/categories
exports.getCategories = async (req, res, next) => {
    try {
        const cacheKey = 'product:categories';
        let categories = await cacheGet(cacheKey);

        if (!categories) {
            categories = await Product.distinct('category', { status: 'active' });
            await cacheSet(cacheKey, categories, 3600);
        }

        res.status(200).json({
            success: true,
            data: { categories },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Check inventory
// @route GET /api/v1/products/:id/inventory
exports.checkInventory = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id)
            .select('name sku inventory');

        if (!product) throw new NotFoundError('Product');

        res.status(200).json({
            success: true,
            data: {
                available: product.availableQuantity,
                total: product.inventory.quantity,
                reserved: product.inventory.reserved,
                isLowStock: product.isLowStock,
            },
        });
    } catch (error) {
        next(error);
    }
};
