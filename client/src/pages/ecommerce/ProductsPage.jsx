import { useState, useEffect } from 'react';
import { productService } from '../../services/services';
import { Search, Plus, Star, ShoppingCart, Package, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [categories, setCategories] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', price: '', category: '', sku: '', inventory: { quantity: 0 } });
    const { user } = useAuth();

    useEffect(() => { fetchProducts(); }, [search, category, pagination.page]);
    useEffect(() => { fetchCategories(); }, []);

    const fetchProducts = async () => {
        try { const { data } = await productService.getAll({ page: pagination.page, search, category, limit: 12 }); setProducts(data.data.products); setPagination(data.data.pagination); }
        catch { } finally { setLoading(false); }
    };

    const fetchCategories = async () => {
        try { const { data } = await productService.getCategories(); setCategories(data.data.categories || []); } catch { }
    };

    const createProduct = async () => {
        try {
            await productService.create({ ...form, price: parseFloat(form.price), inventory: { quantity: parseInt(form.inventory.quantity) } });
            setShowCreate(false); setForm({ name: '', description: '', price: '', category: '', sku: '', inventory: { quantity: 0 } }); fetchProducts();
        } catch { }
    };

    const deleteProduct = async (id) => {
        if (!confirm('Archive this product?')) return;
        try { await productService.delete(id); fetchProducts(); } catch { }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Products</h1>
                    <p className="text-sm text-gray-500 mt-1">{pagination.total} products in catalog</p>
                </div>
                {['admin', 'superadmin'].includes(user?.role) && (
                    <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-gradient text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all">
                        <Plus className="w-4 h-4" /> Add Product
                    </button>
                )}
            </div>

            <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex-1 min-w-[200px] max-w-md focus-within:border-primary/50 focus-within:shadow-sm transition-all">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-400 w-full" />
                </div>
                <select value={category} onChange={e => setCategory(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-600 outline-none focus:border-primary/50 transition-all cursor-pointer">
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {showCreate && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
                    <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-xl border border-gray-100 animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Add Product</h2>
                        <div className="space-y-4">
                            {[{ label: 'Name', key: 'name', placeholder: 'Product name' },
                            { label: 'SKU', key: 'sku', placeholder: 'SKU-00001' },
                            { label: 'Price', key: 'price', placeholder: '99.99', type: 'number' },
                            { label: 'Category', key: 'category', placeholder: 'Electronics' }].map(f => (
                                <div key={f.key}>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">{f.label}</label>
                                    <input type={f.type || 'text'} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm" />
                                </div>
                            ))}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Description</label>
                                <textarea placeholder="Product description..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-primary outline-none transition-all text-sm h-20 resize-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Quantity</label>
                                <input type="number" placeholder="100" value={form.inventory.quantity} onChange={e => setForm({ ...form, inventory: { quantity: e.target.value } })}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-primary outline-none transition-all text-sm" />
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end mt-6">
                            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
                            <button onClick={createProduct} className="px-5 py-2 bg-accent-gradient text-white font-semibold rounded-xl text-sm hover:shadow-lg hover:shadow-primary/20 transition-all">Create</button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center min-h-[40vh]"><div className="w-8 h-8 border-2 border-gray-200 border-t-primary rounded-full animate-spin" /></div>
            ) : products.length === 0 ? (
                <div className="text-center py-20">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No products found</h3>
                    <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {products.map(product => (
                        <div key={product._id} className="glass-card rounded-2xl overflow-hidden group hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-200/60 transition-all duration-300">
                            <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
                                {product.images?.[0]?.url ? (
                                    <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center"><Package className="w-12 h-12 text-gray-300" /></div>
                                )}
                                {product.compareAtPrice > product.price && (
                                    <span className="absolute top-3 left-3 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                                        -{Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}%
                                    </span>
                                )}
                                {['admin', 'superadmin'].includes(user?.role) && (
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => deleteProduct(product._id)} className="p-2 rounded-xl bg-white/90 shadow-sm text-gray-500 hover:text-red-500 transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <p className="text-[11px] text-primary font-semibold uppercase tracking-wide mb-1">{product.category}</p>
                                <h3 className="font-semibold text-sm text-gray-800 truncate mb-2">{product.name}</h3>
                                <div className="flex items-center gap-1 mb-3">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`w-3 h-3 ${i < Math.round(product.ratings?.average || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                                    ))}
                                    <span className="text-[11px] text-gray-400 ml-1">({product.ratings?.count || 0})</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-extrabold text-gray-900">${product.price?.toFixed(2)}</span>
                                        {product.compareAtPrice > product.price && <span className="text-xs text-gray-400 line-through">${product.compareAtPrice?.toFixed(2)}</span>}
                                    </div>
                                    <button className="p-2 rounded-xl bg-primary/5 text-primary hover:bg-primary/10 transition-colors"><ShoppingCart className="w-4 h-4" /></button>
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <div className={`text-[11px] font-medium ${product.inventory?.quantity <= 10 ? 'text-red-500' : 'text-emerald-600'}`}>
                                        {product.inventory?.quantity <= 0 ? '● Out of Stock' : product.inventory?.quantity <= 10 ? `● Low Stock (${product.inventory.quantity})` : `● In Stock (${product.inventory.quantity})`}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                    <button disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages}</span>
                    <button disabled={pagination.page >= pagination.pages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
            )}
        </div>
    );
}
