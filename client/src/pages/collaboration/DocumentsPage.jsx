import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentService, analyticsService } from '../../services/services';
import { Plus, FileText, Search, Clock, Users, MoreVertical, Trash2, Share2 } from 'lucide-react';

export default function DocumentsPage() {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [menuOpen, setMenuOpen] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Track documents page view
        analyticsService.trackEvent({ eventType: 'page_view', page: '/collaboration' }).catch(() => {});
        fetchDocuments();
    }, [search]);

    const fetchDocuments = async () => {
        try {
            const { data } = await documentService.getAll({ search, limit: 50 });
            setDocuments(data.data.documents);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const createDocument = async () => {
        try {
            const { data } = await documentService.create({ title: newTitle || 'Untitled Document' });
            navigate(`/collaboration/${data.data.document._id}`);
        } catch (err) { console.error(err); }
    };

    const deleteDocument = async (id) => {
        if (!confirm('Delete this document?')) return;
        try { await documentService.delete(id); setDocuments(documents.filter(d => d._id !== id)); setMenuOpen(null); } catch { }
    };

    const formatDate = (date) => {
        const d = new Date(date);
        const diff = Date.now() - d;
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Documents</h1>
                    <p className="text-sm text-gray-500 mt-1">Real-time collaborative editing</p>
                </div>
                <button onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-gradient text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all">
                    <Plus className="w-4 h-4" /> New Document
                </button>
            </div>

            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 max-w-md focus-within:border-primary/50 focus-within:shadow-sm transition-all">
                <Search className="w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-400 w-full" />
            </div>

            {showCreate && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
                    <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl border border-gray-100 animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Create Document</h2>
                        <input type="text" placeholder="Document title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all mb-6"
                            autoFocus onKeyDown={(e) => e.key === 'Enter' && createDocument()} />
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
                            <button onClick={createDocument} className="px-5 py-2 bg-accent-gradient text-white font-semibold rounded-xl text-sm hover:shadow-lg hover:shadow-primary/20 transition-all">Create</button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center min-h-[40vh]">
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-primary rounded-full animate-spin" />
                </div>
            ) : documents.length === 0 ? (
                <div className="text-center py-20">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No documents yet</h3>
                    <p className="text-sm text-gray-500 mb-6">Create your first document to start collaborating</p>
                    <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 bg-accent-gradient text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all">
                        <Plus className="w-4 h-4 inline mr-2" />Create Document
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {documents.map(doc => (
                        <div key={doc._id}
                            className="glass-card rounded-2xl p-5 cursor-pointer group hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-200/60 transition-all duration-300 relative"
                            onClick={() => navigate(`/collaboration/${doc._id}`)}>
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === doc._id ? null : doc._id); }}>
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                                {menuOpen === doc._id && (
                                    <div className="absolute right-0 top-8 w-40 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-10 animate-slide-down">
                                        <button onClick={e => e.stopPropagation()} className="w-full px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"><Share2 className="w-3.5 h-3.5" /> Share</button>
                                        <button onClick={(e) => { e.stopPropagation(); deleteDocument(doc._id); }} className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                                    </div>
                                )}
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                                <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="font-semibold text-sm text-gray-800 truncate mb-1">{doc.title || 'Untitled'}</h3>
                            <div className="flex items-center gap-3 mt-3 text-[11px] text-gray-400">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(doc.updatedAt)}</span>
                                {doc.collaborators?.length > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{doc.collaborators.length}</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                                <div className="w-5 h-5 rounded-full bg-accent-gradient flex items-center justify-center text-[10px] font-bold text-white">
                                    {doc.owner?.name?.charAt(0) || '?'}
                                </div>
                                <span className="text-[11px] text-gray-400 truncate">{doc.owner?.name || 'Unknown'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
