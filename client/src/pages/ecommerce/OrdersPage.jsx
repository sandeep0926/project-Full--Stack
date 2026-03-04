import { useState, useEffect } from 'react';
import { orderService, analyticsService } from '../../services/services';
import { Package, Clock, Truck, CheckCircle, XCircle, ChevronRight, CreditCard } from 'lucide-react';
import StripePayModal from '../../components/StripePayModal';

const STATUS_CONFIG = {
    pending: { color: 'text-amber-600 bg-amber-50', icon: Clock, label: 'Pending' },
    confirmed: { color: 'text-blue-600 bg-blue-50', icon: Package, label: 'Confirmed' },
    processing: { color: 'text-purple-600 bg-purple-50', icon: Package, label: 'Processing' },
    shipped: { color: 'text-cyan-600 bg-cyan-50', icon: Truck, label: 'Shipped' },
    delivered: { color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle, label: 'Delivered' },
    canceled: { color: 'text-red-600 bg-red-50', icon: XCircle, label: 'Canceled' },
    returned: { color: 'text-gray-600 bg-gray-100', icon: XCircle, label: 'Returned' },
};

const PAYMENT_STATUS_CONFIG = {
    pending: { color: 'text-amber-600 bg-amber-50', label: 'Payment Pending' },
    processing: { color: 'text-blue-600 bg-blue-50', label: 'Processing' },
    paid: { color: 'text-emerald-600 bg-emerald-50', label: 'Paid' },
    failed: { color: 'text-red-600 bg-red-50', label: 'Failed' },
};

export default function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [payOrderId, setPayOrderId] = useState(null);

    useEffect(() => {
        // Track orders page view
        analyticsService.trackEvent({ eventType: 'page_view', page: '/ecommerce/orders' }).catch(() => { });
        fetchOrders();
    }, [statusFilter]);

    const fetchOrders = async () => {
        try { const { data } = await orderService.getAll({ status: statusFilter || undefined, limit: 50 }); setOrders(data.data.orders); }
        catch { } finally { setLoading(false); }
    };

    const viewOrder = async (id) => {
        try { const { data } = await orderService.getById(id); setSelectedOrder(data.data.order); } catch { }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Orders</h1>
                <p className="text-sm text-gray-500 mt-1">Manage and track orders</p>
            </div>

            <div className="flex flex-wrap gap-2">
                {['', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'canceled'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === s ? 'bg-primary text-white shadow-sm' : 'bg-white text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300'
                            }`}>
                        {s ? STATUS_CONFIG[s]?.label : 'All'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center min-h-[40vh]"><div className="w-8 h-8 border-2 border-gray-200 border-t-primary rounded-full animate-spin" /></div>
            ) : orders.length === 0 ? (
                <div className="text-center py-20">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No orders found</h3>
                    <p className="text-sm text-gray-500">Orders will appear here once placed</p>
                </div>
            ) : (
                <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    {['Order', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Date', ''].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(order => {
                                    const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                                    return (
                                        <tr key={order._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => viewOrder(order._id)}>
                                            <td className="px-4 py-3"><p className="text-sm font-semibold text-primary">{order.orderNumber}</p></td>
                                            <td className="px-4 py-3"><p className="text-sm text-gray-800">{order.customer?.name || 'N/A'}</p><p className="text-xs text-gray-400">{order.customer?.email}</p></td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{order.items?.length || 0} items</td>
                                            <td className="px-4 py-3 text-sm font-bold text-gray-900">${order.total?.toFixed(2)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${PAYMENT_STATUS_CONFIG[order.payment?.status || 'pending'].color}`}>
                                                    {PAYMENT_STATUS_CONFIG[order.payment?.status || 'pending'].label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${sc.color}`}><sc.icon className="w-3 h-3" /> {sc.label}</span></td>
                                            <td className="px-4 py-3 text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                                            <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-gray-300" /></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selectedOrder && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setSelectedOrder(null)}>
                    <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-xl border border-gray-100 animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{selectedOrder.orderNumber}</h2>
                                <p className="text-sm text-gray-400 mt-1">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${STATUS_CONFIG[selectedOrder.status]?.color}`}>
                                {STATUS_CONFIG[selectedOrder.status]?.label}
                            </span>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-500">Items</h3>
                            {selectedOrder.items?.map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                                    <div><p className="text-sm font-medium text-gray-800">{item.name}</p><p className="text-xs text-gray-400">SKU: {item.sku} · Qty: {item.quantity}</p></div>
                                    <span className="text-sm font-bold text-gray-900">${item.total?.toFixed(2)}</span>
                                </div>
                            ))}
                            <div className="border-t border-gray-100 pt-4 space-y-2">
                                <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="text-gray-800">${selectedOrder.subtotal?.toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-gray-500">Tax</span><span className="text-gray-800">${selectedOrder.tax?.toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-gray-500">Shipping</span><span className="text-gray-800">${selectedOrder.shipping?.toFixed(2)}</span></div>
                                <div className="flex justify-between text-base font-bold border-t border-gray-100 pt-2 mt-2">
                                    <span className="text-gray-900">Total</span><span className="gradient-text">${selectedOrder.total?.toFixed(2)}</span>
                                </div>
                            </div>
                            {selectedOrder.payment?.status !== 'paid' && selectedOrder.status !== 'canceled' && (
                                <button type="button" onClick={() => setPayOrderId(selectedOrder._id)} className="mt-4 w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 flex items-center justify-center gap-2">
                                    <CreditCard className="w-4 h-4" /> Pay with Stripe
                                </button>
                            )}
                        </div>
                        <button onClick={() => { setSelectedOrder(null); setPayOrderId(null); }} className="mt-6 w-full py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 bg-gray-50 rounded-xl transition-colors">Close</button>
                    </div>
                </div>
            )}

            {payOrderId && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[60]" onClick={() => setPayOrderId(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-100 animate-slide-up" onClick={e => e.stopPropagation()}>
                        <StripePayModal
                            orderId={payOrderId}
                            orderTotal={selectedOrder?.total}
                            onSuccess={() => { viewOrder(selectedOrder?._id); fetchOrders(); }}
                            onClose={() => setPayOrderId(null)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
