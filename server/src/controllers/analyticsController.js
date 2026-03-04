import AnalyticsEvent from '../models/AnalyticsEvent.js';
import { cacheGet, cacheSet } from '../config/redis.js';
import { enqueueAnalyticsEvent } from '../jobs/queues.js';
import { Parser } from 'json2csv';
import { emitAnalyticsEvent } from '../sockets/analyticsSocket.js';

export const trackEvent = async (req, res, next) => {
    try {
        const payload = {
            ...req.body,
            userId: req.user?._id,
            tenantId: req.user?.tenantId,
            geo: { ip: req.ip },
            device: { browser: req.get('user-agent') },
        };

        const event = await AnalyticsEvent.create(payload);

        // Simulate event-driven processing pipeline
        enqueueAnalyticsEvent({
            ...payload,
            id: event._id.toString(),
        }).catch(() => {});

        // Emit real-time event to WebSocket clients
        try {
            const { io } = await import('../server.js');
            emitAnalyticsEvent(io, event.toObject());
        } catch (err) {
            // Socket emission is non-critical, log and continue
            console.error('Failed to emit analytics event:', err.message);
        }

        res.status(201).json({ success: true, data: { event } });
    } catch (error) { next(error); }
};

export const getDashboard = async (req, res, next) => {
    try {
        const { period = '7d' } = req.query;
        const cacheKey = `analytics:dashboard:${req.user?.tenantId || 'all'}:${period}`;
        const cached = await cacheGet(cacheKey);
        if (cached) return res.status(200).json({ success: true, data: cached });

        const days = parseInt(period) || 7;
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const tenantMatch = req.user?.tenantId ? { tenantId: req.user.tenantId } : {};

        const [overview, dailyEvents, topPages, deviceBreakdown, revenueData, userActivity] = await Promise.all([
            // Overview stats
            AnalyticsEvent.aggregate([
                { $match: { ...tenantMatch, createdAt: { $gte: startDate } } },
                { $group: { _id: null, totalEvents: { $sum: 1 }, uniqueUsers: { $addToSet: '$userId' }, totalRevenue: { $sum: { $ifNull: ['$revenue', 0] } } } },
                { $project: { totalEvents: 1, uniqueUsers: { $size: '$uniqueUsers' }, totalRevenue: 1 } },
            ]),
            // Daily events
            AnalyticsEvent.aggregate([
                { $match: { ...tenantMatch, createdAt: { $gte: startDate } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, revenue: { $sum: { $ifNull: ['$revenue', 0] } } } },
                { $sort: { _id: 1 } },
            ]),
            // Top pages
            AnalyticsEvent.aggregate([
                { $match: { ...tenantMatch, eventType: 'page_view', createdAt: { $gte: startDate } } },
                { $group: { _id: '$page', views: { $sum: 1 } } },
                { $sort: { views: -1 } }, { $limit: 10 },
            ]),
            // Device breakdown
            AnalyticsEvent.aggregate([
                { $match: { ...tenantMatch, createdAt: { $gte: startDate } } },
                { $group: { _id: '$device.type', count: { $sum: 1 } } },
            ]),
            // Revenue by day
            AnalyticsEvent.aggregate([
                { $match: { ...tenantMatch, eventType: 'purchase', createdAt: { $gte: startDate } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$revenue' }, orders: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            // User activity
            AnalyticsEvent.aggregate([
                { $match: { ...tenantMatch, createdAt: { $gte: startDate } } },
                { $group: { _id: '$eventType', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
        ]);

        const result = {
            overview: overview[0] || { totalEvents: 0, uniqueUsers: 0, totalRevenue: 0 },
            dailyEvents, topPages, deviceBreakdown, revenueData, userActivity,
        };

        await cacheSet(cacheKey, result, 60);
        res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
};

export const getRealtimeStats = async (req, res, next) => {
    try {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        const tenantMatch = req.user?.tenantId ? { tenantId: req.user.tenantId } : {};

        const [activeUsers, recentEvents] = await Promise.all([
            AnalyticsEvent.distinct('userId', { ...tenantMatch, createdAt: { $gte: fiveMinAgo } }),
            AnalyticsEvent.find({ ...tenantMatch, createdAt: { $gte: fiveMinAgo } })
                .sort({ createdAt: -1 }).limit(20).lean(),
        ]);

        res.status(200).json({ success: true, data: { activeUsers: activeUsers.length, recentEvents } });
    } catch (error) { next(error); }
};

export const exportData = async (req, res, next) => {
    try {
        const { startDate, endDate, eventType, format = 'csv' } = req.query;
        
        // Build query
        const query = {};
        if (req.user?.tenantId) query.tenantId = req.user.tenantId;
        
        // Date range filtering
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }
        
        // Event type filtering
        if (eventType) query.eventType = eventType;

        // Fetch events (limit to 100K for performance)
        const events = await AnalyticsEvent.find(query)
            .sort({ createdAt: -1 })
            .limit(100000)
            .lean();

        if (format === 'csv') {
            // CSV Export using json2csv for proper formatting
            const fields = [
                { label: 'Date', value: 'createdAt' },
                { label: 'Event Type', value: 'eventType' },
                { label: 'User ID', value: 'userId' },
                { label: 'Tenant ID', value: 'tenantId' },
                { label: 'Page', value: 'page' },
                { label: 'Revenue', value: 'revenue' },
                { label: 'Device Type', value: 'device.type' },
                { label: 'Browser', value: 'device.browser' },
                { label: 'Country', value: 'geo.country' },
                { label: 'City', value: 'geo.city' },
                { label: 'IP Address', value: 'geo.ip' },
                { label: 'Referrer', value: 'referrer' },
                { label: 'Session ID', value: 'sessionId' },
            ];

            const parser = new Parser({ 
                fields,
                defaultValue: '',
                transforms: [
                    (item) => ({
                        ...item,
                        createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : '',
                        userId: item.userId ? item.userId.toString() : '',
                        tenantId: item.tenantId ? item.tenantId.toString() : '',
                        revenue: item.revenue || 0,
                    })
                ]
            });
            
            const csv = parser.parse(events);
            
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `analytics_export_${timestamp}.csv`;
            
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.send(csv);
        }

        if (format === 'excel') {
            const { default: ExcelJS } = await import('exceljs');
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Analytics');

            worksheet.columns = [
                { header: 'Date', key: 'date', width: 24 },
                { header: 'Event Type', key: 'eventType', width: 20 },
                { header: 'User ID', key: 'userId', width: 24 },
                { header: 'Tenant ID', key: 'tenantId', width: 24 },
                { header: 'Page', key: 'page', width: 32 },
                { header: 'Revenue', key: 'revenue', width: 12 },
                { header: 'Device', key: 'device', width: 12 },
                { header: 'Browser', key: 'browser', width: 16 },
                { header: 'Country', key: 'country', width: 16 },
                { header: 'City', key: 'city', width: 16 },
            ];

            events.forEach((e) => {
                worksheet.addRow({
                    date: e.createdAt?.toISOString(),
                    eventType: e.eventType,
                    userId: e.userId?.toString(),
                    tenantId: e.tenantId?.toString(),
                    page: e.page || '',
                    revenue: e.revenue || 0,
                    device: e.device?.type || '',
                    browser: e.device?.browser || '',
                    country: e.geo?.country || '',
                    city: e.geo?.city || '',
                });
            });

            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `analytics_export_${timestamp}.xlsx`;

            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="${filename}"`
            );

            await workbook.xlsx.write(res);
            return res.end();
        }

        // JSON format (default)
        res.status(200).json({ 
            success: true, 
            data: { 
                events,
                count: events.length,
                filters: { startDate, endDate, eventType }
            } 
        });
    } catch (error) { 
        next(error); 
    }
};

export const getConversionFunnel = async (req, res, next) => {
    try {
        const { period = '30d' } = req.query;
        const days = parseInt(period) || 30;
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const tenantMatch = req.user?.tenantId ? { tenantId: req.user.tenantId } : {};

        const funnel = await AnalyticsEvent.aggregate([
            { $match: { ...tenantMatch, createdAt: { $gte: startDate }, eventType: { $in: ['page_view', 'product_view', 'add_to_cart', 'checkout_start', 'purchase'] } } },
            { $group: { _id: '$eventType', count: { $sum: 1 }, uniqueUsers: { $addToSet: '$userId' } } },
            { $project: { eventType: '$_id', count: 1, uniqueUsers: { $size: '$uniqueUsers' } } },
        ]);

        res.status(200).json({ success: true, data: { funnel } });
    } catch (error) { next(error); }
};

export default {
    trackEvent,
    getDashboard,
    getRealtimeStats,
    exportData,
    getConversionFunnel,
};
