import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { documentService, analyticsService } from '../../services/services';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Save, Clock, Share2, Check, Wifi, WifiOff } from 'lucide-react';

export default function EditorPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [document, setDocument] = useState(null);
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [activeUsers, setActiveUsers] = useState([]);
    const [connected, setConnected] = useState(false);
    const [showVersions, setShowVersions] = useState(false);
    const [versions, setVersions] = useState([]);
    const socketRef = useRef(null);
    const editorRef = useRef(null);
    const saveTimerRef = useRef(null);

    useEffect(() => {
        // Track editor page view
        analyticsService
            .trackEvent({ eventType: 'page_view', page: `/collaboration/${id}` })
            .catch(() => {});

        fetchDocument();
        connectSocket();
        return () => {
            if (socketRef.current) { socketRef.current.emit('leave-document', id); socketRef.current.disconnect(); }
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [id]);

    const fetchDocument = async () => {
        try {
            const { data } = await documentService.getById(id);
            setDocument(data.data.document);
            setTitle(data.data.document.title);
            setContent(data.data.document.plainText || '');
        } catch { navigate('/collaboration'); }
    };

    const connectSocket = () => {
        const token = sessionStorage.getItem('accessToken');
        const socket = io(window.location.origin, { auth: { token }, transports: ['websocket'] });
        socketRef.current = socket;
        socket.on('connect', () => { setConnected(true); socket.emit('join-document', id); });
        socket.on('disconnect', () => setConnected(false));
        socket.on('active-users', (users) => setActiveUsers(users));
        socket.on('user-joined', (u) => setActiveUsers(prev => [...prev.filter(x => x.userId !== u.userId), u]));
        socket.on('user-left', ({ userId }) => setActiveUsers(prev => prev.filter(x => x.userId !== userId)));
        socket.on('text-change', ({ delta, userId }) => { if (userId !== user?._id) setContent(prev => prev + (delta || '')); });
        socket.on('save-success', () => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); });
    };

    const handleContentChange = (e) => {
        const newContent = e.target.value;
        setContent(newContent);
        if (socketRef.current) socketRef.current.emit('text-change', { documentId: id, delta: newContent, source: 'user' });
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => saveDocument(newContent), 2000);
    };

    const saveDocument = async (text = content, docTitle = title) => {
        setSaving(true);
        try {
            if (socketRef.current) {
                socketRef.current.emit('save-document', { documentId: id, content: { ops: [{ insert: text }] }, plainText: text });
            } else {
                await documentService.update(id, { title: docTitle, content: { ops: [{ insert: text }] }, plainText: text });
                setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
            }
        } catch { setSaving(false); }
    };

    const loadVersions = async () => {
        try { const { data } = await documentService.getVersions(id); setVersions(data.data.versions || []); setShowVersions(true); } catch { }
    };

    const restoreVersion = async (vn) => {
        try { const { data } = await documentService.restoreVersion(id, vn); setContent(data.data.document.plainText || ''); setShowVersions(false); } catch { }
    };

    if (!document) {
        return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-gray-200 border-t-primary rounded-full animate-spin" /></div>;
    }

    return (
        <div className="animate-fade-in -m-6">
            <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 sticky top-16 z-20">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/collaboration')} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); if (saveTimerRef.current) clearTimeout(saveTimerRef.current); saveTimerRef.current = setTimeout(() => saveDocument(content, e.target.value), 2000); }}
                        className="text-lg font-bold bg-transparent border-none outline-none text-gray-900 placeholder:text-gray-400 min-w-[200px]" placeholder="Untitled Document" />
                    <div className="flex items-center gap-1.5 text-xs">
                        {saving && <><div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /><span className="text-gray-400">Saving...</span></>}
                        {saved && <><Check className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-500">Saved</span></>}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${connected ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                        {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        {connected ? 'Connected' : 'Offline'}
                    </div>
                    <div className="flex items-center -space-x-2">
                        {activeUsers.slice(0, 5).map(u => (
                            <div key={u.userId} className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white relative group" style={{ backgroundColor: u.color }} title={u.name}>
                                {u.name?.charAt(0)?.toUpperCase() || '?'}
                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{u.name}</div>
                            </div>
                        ))}
                    </div>
                    <button onClick={loadVersions} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="Version History"><Clock className="w-4 h-4" /></button>
                    <button onClick={() => saveDocument()} className="px-4 py-2 bg-accent-gradient text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Save</button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-8">
                <textarea ref={editorRef} value={content} onChange={handleContentChange}
                    className="w-full min-h-[70vh] bg-transparent border-none outline-none text-gray-700 text-base leading-relaxed resize-none placeholder:text-gray-400"
                    placeholder="Start typing your document..." spellCheck />
            </div>

            {showVersions && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowVersions(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[70vh] overflow-hidden flex flex-col shadow-xl border border-gray-100 animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Version History</h2>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                            {versions.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No versions yet</p> :
                                versions.map((v, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                                        <div><p className="text-sm font-medium text-gray-800">Version {v.versionNumber}</p><p className="text-xs text-gray-400">{new Date(v.savedAt).toLocaleString()}</p></div>
                                        <button onClick={() => restoreVersion(v.versionNumber)} className="px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5 rounded-lg transition-colors">Restore</button>
                                    </div>
                                ))
                            }
                        </div>
                        <button onClick={() => setShowVersions(false)} className="mt-4 w-full py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 bg-gray-50 rounded-xl transition-colors">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}
