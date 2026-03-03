import AnalyticsEvent from '../models/AnalyticsEvent.js';
import { cacheGet, cacheSet } from '../config/redis.js';
import { enqueueAnalyticsEvent } from '../jobs/queues.js';

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
        const { startDate, endDate, format = 'csv' } = req.query;
        const query = {};
        if (req.user?.tenantId) query.tenantId = req.user.tenantId;
        if (startDate) query.createdAt = { $gte: new Date(startDate) };
        if (endDate) query.createdAt = { ...query.createdAt, $lte: new Date(endDate) };

        const events = await AnalyticsEvent.find(query).sort({ createdAt: -1 }).limit(10000).lean();

        if (format === 'csv') {
            const headers = ['Date', 'Event Type', 'User ID', 'Page', 'Revenue', 'Device', 'Country'];
            const rows = events.map(e => [
                e.createdAt?.toISOString(), e.eventType, e.userId, e.page || '', e.revenue || 0, e.device?.type || '', e.geo?.country || '',
            ]);
            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=analytics_export.csv');
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
                { header: 'Page', key: 'page', width: 32 },
                { header: 'Revenue', key: 'revenue', width: 12 },
                { header: 'Device', key: 'device', width: 12 },
                { header: 'Country', key: 'country', width: 16 },
            ];

            events.forEach((e) => {
                worksheet.addRow({
                    date: e.createdAt?.toISOString(),
                    eventType: e.eventType,
                    userId: e.userId?.toString(),
                    page: e.page || '',
                    revenue: e.revenue || 0,
                    device: e.device?.type || '',
                    country: e.geo?.country || '',
                });
            });

            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                'attachment; filename=analytics_export.xlsx'
            );

            await workbook.xlsx.write(res);
            return res.end();
        }

        res.status(200).json({ success: true, data: { events } });
    } catch (error) { next(error); }
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
