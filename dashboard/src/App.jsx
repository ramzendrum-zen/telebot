import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
    LayoutDashboard, 
    Ticket, 
    ShieldCheck, 
    History, 
    Users, 
    BarChart3, 
    Settings, 
    Bot, 
    AlertTriangle, 
    CheckCircle, 
    XCircle, 
    Clock, 
    ArrowRight, 
    Activity,
    MessageSquare,
    ExternalLink,
    FileText,
    TrendingUp,
    Image as ImageIcon
} from 'lucide-react';

const App = () => {
    const [activeBot, setActiveBot] = useState('assistant');
    const [activePanel, setActivePanel] = useState('overview');
    const [complaints, setComplaints] = useState([]);
    const [stats, setStats] = useState(null);
    const [monitorData, setMonitorData] = useState({ logs: [], metrics: { assistant: {}, grievance: {} } });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastSync, setLastSync] = useState(null);

    useEffect(() => {
        fetchAllData();
        const interval = setInterval(fetchAllData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchAllData = async () => {
        try {
            const [compRes, statsRes, monRes, usersRes] = await Promise.all([
                axios.get('/api/admin/complaints'),
                axios.get('/api/admin/stats'),
                axios.get('/api/monitor'),
                axios.get('/api/admin/users')
            ]);
            setComplaints(compRes.data);
            setStats(statsRes.data);
            setMonitorData(monRes.data);
            setUsers(usersRes.data);
            setLastSync(new Date().toLocaleTimeString([], { hour12: false }));
            setLoading(false);
        } catch (e) {
            console.error("Fetch failed", e);
            setLoading(false);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await axios.patch(`/api/admin/complaints/${id}`, { status });
            fetchAllData();
        } catch (e) { console.error(e); }
    };

    const handleAction = async (id, action) => {
        try {
            await axios.post(`/api/admin/complaints/${id}/action`, { action });
            fetchAllData();
        } catch (e) { console.error(e); }
    };

    // Filters and Data Processing
    const grievancesList = useMemo(() => complaints.filter(c => !c.is_emergency), [complaints]);
    const emergenciesList = useMemo(() => complaints.filter(c => c.is_emergency && c.status !== 'resolved' && c.status !== 'rejected'), [complaints]);
    const historyList = useMemo(() => complaints.filter(c => c.status === 'resolved' || c.status === 'rejected'), [complaints]);
    
    // UI Helpers
    const navItems = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'tickets', label: 'Operational Tickets', icon: Ticket, show: activeBot === 'grievance' },
        { id: 'grievance', label: 'Emergency Center', icon: ShieldCheck, show: activeBot === 'grievance', badge: emergenciesList.length },
        { id: 'history', label: 'Grievance Archive', icon: History, show: activeBot === 'grievance' },
        { id: 'users', label: 'User Directory', icon: Users, show: true },
        { id: 'analytics', label: 'System Analytics', icon: BarChart3, show: true },
        { id: 'settings', label: 'Settings', icon: Settings, show: true },
    ];

    if (loading && !stats) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-slate-500 font-semibold animate-pulse uppercase tracking-widest text-[10px]">Initializing MSAJCE Terminal...</p>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-[#f9fafb] text-slate-900 font-sans selection:bg-blue-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed inset-y-0 z-50">
                <div className="p-6 flex items-center gap-3 border-b border-slate-100">
                    <div className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-black text-lg shadow-sm">M</div>
                    <span className="font-bold text-sm tracking-tight text-slate-800 uppercase">MSAJCE Terminal</span>
                </div>
                
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.filter(item => item.show !== false).map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActivePanel(item.id)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                activePanel === item.id 
                                ? 'bg-blue-50 text-blue-600 shadow-sm shadow-blue-100' 
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon size={18} />
                                {item.label}
                            </div>
                            {item.badge > 0 && (
                                <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        System Online
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 flex flex-col min-h-screen">
                {/* Header */}
                <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40">
                    <h2 className="font-bold text-slate-800 text-lg tracking-tight capitalize">
                        {activePanel} Dashboard
                    </h2>

                    {/* Bot Switcher Panel at the Top */}
                    <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200 shadow-inner">
                        <button 
                            onClick={() => setActiveBot('assistant')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                                activeBot === 'assistant' 
                                ? 'bg-white text-blue-600 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Bot size={14} /> ASSISTANT
                        </button>
                        <button 
                            onClick={() => setActiveBot('grievance')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                                activeBot === 'grievance' 
                                ? 'bg-white text-blue-600 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <ShieldCheck size={14} /> GRIEVANCE
                        </button>
                    </div>

                    <div className="flex items-center gap-4 text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-widest border-r border-slate-200 pr-4">
                            {lastSync ? `Synced ${lastSync}` : 'Syncing...'}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs shadow-inner">
                            A
                        </div>
                    </div>
                </header>

                {/* Dashboard Area */}
                <div className="p-8">
                    {activePanel === 'overview' && (
                        <div className="space-y-8">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <StatCard 
                                    label={activeBot === 'grievance' ? 'Total Users' : 'Total Queries'}
                                    value={activeBot === 'grievance' ? stats?.users?.total : monitorData?.metrics?.assistant?.total_requests || 0}
                                    icon={activeBot === 'grievance' ? Users : MessageSquare}
                                    trend="Institutional Base"
                                />
                                <StatCard 
                                    label={activeBot === 'grievance' ? 'Tickets (Today)' : 'Success Rate'}
                                    value={activeBot === 'grievance' ? stats?.complaints?.total || 0 : `${monitorData?.metrics?.assistant?.success_rate || 100}%`}
                                    icon={activeBot === 'grievance' ? Ticket : CheckCircle}
                                    trend="Active Sessions"
                                    color="blue"
                                />
                                <StatCard 
                                    label={activeBot === 'grievance' ? 'Emergencies' : 'System Errors'}
                                    value={activeBot === 'grievance' ? stats?.complaints?.emergency || 0 : monitorData?.metrics?.assistant?.total_errors || 0}
                                    icon={AlertTriangle}
                                    trend="Needs Review"
                                    color={activeBot === 'grievance' ? 'red' : 'amber'}
                                />
                                <StatCard 
                                    label={activeBot === 'grievance' ? 'Resolution Time' : 'Avg Latency'}
                                    value={activeBot === 'grievance' ? `${stats?.complaints?.avg_resolution || '0.0'}h` : `${(monitorData?.metrics?.assistant?.avg_latency || 0).toFixed(0)}ms`}
                                    icon={Clock}
                                    trend={activeBot === 'grievance' ? 'Target: < 12h' : 'Network Speed'}
                                />
                            </div>

                            {/* Main Body Grid */}
                            <div className={`grid gap-6 ${activeBot === 'grievance' ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
                                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                            <Activity size={18} className="text-blue-600" />
                                            System Pulse (Live Activity)
                                        </h3>
                                    </div>
                                    <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                                        {monitorData.logs.filter(l => activeBot === 'assistant' ? l.bot === 'assistant' : l.bot === 'grievance').slice(0, 15).map((log, i) => (
                                            <div key={i} className="flex gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors group">
                                                <span className="text-[10px] font-mono font-bold text-slate-400 mt-1 whitespace-nowrap text-right min-w-[45px]">
                                                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <div className="flex-1">
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase mr-2 shadow-sm ${
                                                        log.bot === 'assistant' ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white'
                                                    }`}>
                                                        {log.bot.slice(0, 3)}
                                                    </span>
                                                    <p className="text-xs font-semibold text-slate-700 leading-relaxed mt-0.5">
                                                        {log.message}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {activeBot === 'grievance' && (
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                        <div className="border-b border-slate-100 pb-4 mb-6">
                                            <h3 className="font-bold text-slate-800">Operational Summary</h3>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-slate-500">Solved Tickets</span>
                                                <span className="text-xl font-black text-slate-900">{historyList.length}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-slate-500">Live Queue</span>
                                                <span className="text-xl font-black text-slate-900">{grievancesList.filter(c => c.status !== 'resolved' && c.status !== 'rejected').length + emergenciesList.length}</span>
                                            </div>
                                            <div className="pt-4 border-t border-slate-100">
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Urgent Actions</h4>
                                                <button 
                                                    onClick={() => setActivePanel('grievance')}
                                                    className="w-full bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl flex items-center justify-between group hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                >
                                                    <div className="flex items-center gap-3 font-bold text-sm">
                                                        <AlertTriangle size={18} />
                                                        {emergenciesList.length} Active Emergencies
                                                    </div>
                                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activePanel === 'tickets' && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                             <div className="p-6 border-b border-slate-100">
                                <h3 className="font-bold text-slate-800">Pending Grievances</h3>
                             </div>
                             <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-[#f8fafc] text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Ticket</th>
                                            <th className="px-6 py-4">Category</th>
                                            <th className="px-6 py-4">Initiator</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Assigned To</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {grievancesList.filter(c => c.status !== 'resolved' && c.status !== 'rejected').map(c => (
                                            <React.Fragment key={c.complaint_id}>
                                            <tr className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-8 font-black font-mono text-blue-600">{c.complaint_id}</td>
                                                <td className="px-6 py-8">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-700 text-sm">{c.category}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">Submitted {new Date(c.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-8">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-800">{c.is_anonymous ? '🎭 Anonymous' : (c.student_id?.name || 'User')}</span>
                                                        <span className="text-[10px] text-slate-400 uppercase font-bold">{c.student_id?.department || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-8">
                                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm border ${
                                                        c.status === 'in_progress' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                                                    }`}>
                                                        {c.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-8 font-semibold text-slate-500 text-xs">{c.department_assigned || 'Admin'}</td>
                                                <td className="px-6 py-8 text-right">
                                                    <div className="flex gap-2 justify-end">
                                                        <button onClick={() => updateStatus(c.complaint_id, 'in_progress')} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-[10px] font-black hover:bg-amber-500 hover:text-white transition-all shadow-sm">PROCESS</button>
                                                        <button onClick={() => updateStatus(c.complaint_id, 'resolved')} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-[10px] font-black hover:bg-emerald-600 transition-all shadow-md">RESOLVE</button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Expandable Evidence/Description Area */}
                                            <tr className="bg-slate-50/30">
                                                <td colSpan="6" className="px-8 py-6 border-b border-slate-100">
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                                <FileText size={12} /> Grievance Statement:
                                                            </p>
                                                            <p className="text-slate-600 text-sm leading-relaxed font-medium bg-white p-4 rounded-xl border border-slate-100 shadow-sm">{c.description}</p>
                                                            {c.admin_response && (
                                                                <div className="mt-4">
                                                                     <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Admin Feedback:</p>
                                                                     <p className="text-slate-600 text-xs italic bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">{c.admin_response}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {c.evidence_urls && c.evidence_urls.length > 0 && (
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                    <ImageIcon size={12} /> Evidence Artifacts ({c.evidence_urls.length}):
                                                                </p>
                                                                <div className="flex flex-wrap gap-3">
                                                                    {c.evidence_urls.map((url, i) => (
                                                                        <a key={i} href={url} target="_blank" rel="noreferrer" className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-white hover:border-blue-500 transition-all group relative">
                                                                            <img src={url} alt="Evidence" className="w-full h-full object-cover group-hover:scale-110 transition-transform" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                                                                            <div className="hidden absolute inset-0 items-center justify-center bg-slate-50 text-[10px] font-black text-slate-400 uppercase">FILE</div>
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                             </div>
                        </div>
                    )}

                    {activePanel === 'grievance' && (
                        <div className="space-y-6">
                            <div className="bg-red-50 border border-red-100 p-8 rounded-3xl flex items-center justify-between shadow-sm">
                                <div>
                                    <h3 className="text-red-900 font-black text-xl flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-red-600 animate-ping"></div>
                                        Security Emergency Queue
                                    </h3>
                                    <p className="text-red-600/70 text-sm font-bold mt-1 uppercase tracking-widest">Immediate Response Required</p>
                                </div>
                                <div className="bg-red-600 text-white px-6 py-2 rounded-2xl font-black text-2xl shadow-lg shadow-red-600/20">{emergenciesList.length}</div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {emergenciesList.length === 0 && (
                                    <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-slate-100">
                                        <ShieldCheck size={48} className="mx-auto text-emerald-100 mb-4" />
                                        <h4 className="text-slate-300 font-black uppercase text-sm tracking-widest">No Active SOS Alerts</h4>
                                    </div>
                                )}
                                {emergenciesList.map(c => (
                                    <div key={c.complaint_id} className="bg-white border-2 border-red-100 p-8 rounded-[2rem] shadow-xl shadow-red-500/5 relative overflow-hidden group hover:border-red-300 hover:shadow-red-500/10 transition-all">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl rounded-full translate-x-12 -translate-y-12"></div>
                                        
                                        <div className="flex justify-between items-start mb-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center animate-pulse shadow-lg shadow-red-600/30">
                                                    <AlertTriangle size={28} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-slate-900 text-xl uppercase tracking-tighter">{c.category}</h4>
                                                    <span className="text-[10px] font-black text-red-600 uppercase tracking-widest px-2 py-1 rounded bg-red-50 border border-red-100 mt-1 inline-block">CRITICAL SOS</span>
                                                </div>
                                            </div>
                                            <span className="font-black font-mono text-red-600 text-lg bg-red-50 px-4 py-1 rounded-xl border border-red-100">{c.complaint_id}</span>
                                        </div>

                                        <div className="bg-slate-50 p-6 rounded-[1.5rem] space-y-6 border border-slate-100">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Exact Location</span>
                                                <span className="text-sm font-black text-slate-900 bg-white px-4 py-1.5 rounded-lg border border-slate-200">📍 {c.location || 'N/A'}</span>
                                            </div>
                                            <div className="border-t border-slate-200 pt-5">
                                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-3">Live Statement</span>
                                                <span className="text-sm font-bold text-slate-700 leading-relaxed italic block bg-white p-4 rounded-xl border border-slate-200">{c.description}</span>
                                            </div>
                                        </div>

                                        <div className="mt-10 flex gap-4">
                                            <button onClick={() => handleAction(c.complaint_id, 'dispatch')} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black text-xs shadow-lg shadow-red-600/30 hover:bg-red-700 transition-all flex items-center justify-center gap-3 active:scale-95">
                                                <ArrowRight size={18} /> DISPATCH RESPONSE
                                            </button>
                                            <button onClick={() => handleAction(c.complaint_id, 'resolve')} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs hover:bg-emerald-600 transition-all shadow-md flex items-center justify-center gap-3 active:scale-95">
                                                <CheckCircle size={18} /> RESOLVE
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activePanel === 'history' && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                             <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 text-lg">Grievance Archives</h3>
                                <div className="flex gap-6">
                                    <div className="flex items-center gap-2 text-[11px] font-black text-emerald-600"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30"></div> RESOLVED</div>
                                    <div className="flex items-center gap-2 text-[11px] font-black text-red-600"><div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-lg shadow-red-500/30"></div> REJECTED</div>
                                </div>
                             </div>
                             <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-[#f8fafc] text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Ticket</th>
                                            <th className="px-6 py-4">Category</th>
                                            <th className="px-6 py-4">Reporter</th>
                                            <th className="px-6 py-4">Closed On</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Archival Record</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {historyList.map(c => (
                                            <tr key={c.complaint_id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-6 font-black font-mono text-slate-700 text-lg">{c.complaint_id}</td>
                                                <td className="px-6 py-6 font-black text-slate-600 text-sm whitespace-nowrap">{c.category}</td>
                                                <td className="px-6 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-slate-800">{c.is_anonymous ? '🎭 Anon' : (c.student_id?.name || 'User')}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{c.student_id?.register_number || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 font-bold text-slate-500 text-xs">
                                                    {new Date(c.updated_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="px-6 py-6">
                                                    <span className={`text-[10px] font-black px-3 py-1 rounded-lg shadow-sm border ${
                                                        c.status === 'resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                                                    }`}>
                                                        {c.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-6 text-right">
                                                    <button className="bg-slate-50 text-slate-400 p-2 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-inner">
                                                        <FileText size={20} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             </div>
                        </div>
                    )}

                    {activePanel === 'users' && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="font-black text-slate-800 text-xl tracking-tighter">User Directory</h3>
                                <div className="text-[10px] font-black text-slate-400 bg-slate-100 px-4 py-2 rounded-full uppercase tracking-widest">{users.length} Active Records</div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-[#f8fafc] text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Identity</th>
                                            <th className="px-6 py-4">Department</th>
                                            <th className="px-6 py-4">Instituional ID</th>
                                            <th className="px-6 py-4">Verification</th>
                                            <th className="px-6 py-4 text-right">Registration</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {users.map(u => (
                                            <tr key={u._id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-6 py-6 transition-all group-hover:translate-x-2">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-600/20">
                                                            {u.name?.charAt(0) || u.telegram_first_name?.charAt(0) || 'U'}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-black text-slate-800">{u.name || (u.telegram_first_name + ' (TG)')}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{u.role}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 font-black text-slate-600 text-xs uppercase tracking-tight">{u.department || 'General'}</td>
                                                <td className="px-6 py-6 font-black font-mono text-xs text-slate-800">{u.register_number || u.employee_id || 'NOT LINKED'}</td>
                                                <td className="px-6 py-6">
                                                    {u.verified ? (
                                                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5 w-fit">
                                                            <div className="w-1 h-1 rounded-full bg-emerald-600"></div> VERIFIED
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] font-black text-slate-400 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full w-fit inline-block">PENDING</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-6 text-right text-[11px] font-bold text-slate-400">
                                                    {new Date(u.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

const StatCard = ({ label, value, icon: Icon, trend, color = "slate" }) => {
    const colorClasses = {
        blue: "text-blue-600 bg-blue-50 border-blue-100 shadow-blue-500/5",
        amber: "text-amber-600 bg-amber-50 border-amber-100 shadow-amber-500/5",
        red: "text-red-600 bg-red-50 border-red-100 shadow-red-500/5",
        slate: "text-slate-600 bg-slate-50 border-slate-200 shadow-slate-500/5"
    };

    return (
        <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/20 hover:shadow-blue-500/10 hover:-translate-y-1 transition-all group">
            <div className="flex justify-between items-start mb-6">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                <div className={`p-3 rounded-2xl ${colorClasses[color]} border transition-transform group-hover:scale-110 shadow-lg`}>
                    <Icon size={20} />
                </div>
            </div>
            <div className="flex flex-col">
                <h4 className="text-3xl font-black text-slate-900 tracking-tighter">{value}</h4>
                <div className="flex items-center gap-2 mt-3">
                    <TrendingUp size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{trend}</span>
                </div>
            </div>
        </div>
    );
};

export default App;
