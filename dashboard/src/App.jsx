/* VERSION 9.1.0 - MSAJCE TERMINAL - BALANCED UTILITY */
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
    Activity, Home, Settings, Cpu, Inbox, Shield, History, 
    UserCircle, Users, Bell, AlertCircle, Clock, Terminal, 
    BarChart3, MapPin, User, ChevronRight, AlertOctagon, Zap,
    MoreHorizontal, CheckCircle, XCircle, Globe, Layers, Command,
    ExternalLink, Filter, Search, Terminal as TerminalIcon
} from 'lucide-react';

const MetricCard = ({ label, value, icon: Icon, color = "slate", unit = "" }) => {
    const colors = {
        indigo: 'text-indigo-600',
        emerald: 'text-emerald-500',
        rose: 'text-rose-500',
        amber: 'text-amber-500',
        slate: 'text-slate-500'
    };
    return (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:border-indigo-100 transition-all flex-1 min-w-[220px]">
            <div className="flex items-center gap-3 mb-3">
                <div className={`${colors[color] || colors.slate}`}>
                    {Icon ? <Icon size={16} strokeWidth={2} /> : <Activity size={16} strokeWidth={2} />}
                </div>
                <span className="text-[12px] text-slate-500 font-medium lowercase tracking-tight">{label}</span>
            </div>
            <div className="text-2xl text-slate-900 font-medium tracking-tighter">
                {value ?? 0}<span className="text-sm ml-1 text-slate-400 font-normal">{unit}</span>
            </div>
        </div>
    );
};

const App = () => {
    const [activeBot, setActiveBot] = useState('assistant');
    const [activePanel, setActivePanel] = useState('overview');
    const [complaints, setComplaints] = useState([]);
    const [stats, setStats] = useState(null);
    const [monitorData, setMonitorData] = useState({ logs: [], metrics: { assistant: {}, grievance: {} } });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastSync, setLastSync] = useState(null);

    const pull = async () => {
        try {
            const [c, s, m, u] = await Promise.all([
                axios.get('/api/admin/complaints').catch(() => ({data: []})),
                axios.get('/api/admin/stats').catch(() => ({data: null})),
                axios.get('/api/monitor').catch(() => ({data: {logs:[], metrics:{}}})),
                axios.get('/api/admin/users').catch(() => ({data: []}))
            ]);
            setComplaints(c.data || []);
            setStats(s.data);
            setMonitorData(m.data || {logs:[], metrics:{}});
            setUsers(u.data || []);
            setLastSync(new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }));
            setLoading(false);
        } catch (e) { setLoading(false); }
    };

    useEffect(() => {
        pull();
        const i = setInterval(pull, 10000);
        return () => clearInterval(i);
    }, []);

    const nav = useMemo(() => {
        const common = [
            { id: 'overview', label: 'overview', icon: Layers },
            { id: 'analytics', label: 'analytics', icon: Activity },
            { id: 'settings', label: 'settings', icon: Settings },
        ];
        if (activeBot === 'assistant') {
            return [ common[0], { id: 'assistant', label: 'assistant', icon: Cpu }, common[1], common[2] ];
        }
        return [ 
            common[0], 
            { id: 'tickets', label: 'tickets', icon: Inbox }, 
            { id: 'grievance', label: 'emergency', icon: Shield, badge: (complaints || []).filter(cl => cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected').length }, 
            { id: 'users', label: 'users', icon: UserCircle }, 
            { id: 'history', label: 'history', icon: History },
            common[1], 
            common[2] 
        ];
    }, [activeBot, complaints]);

    useEffect(() => {
        if (!nav.find(i => i.id === activePanel)) setActivePanel('overview');
    }, [activeBot, nav]);

    const handle = async (id, action) => {
        try { await axios.post(`/api/admin/complaints/${id}/action`, { action }); pull(); } catch (e) {}
    };

    if (loading && !stats) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-400 font-medium lowercase tracking-[0.2em]">syncing msajce terminal...</div>;

    return (
        <div className="flex h-screen bg-[#fafbfc] text-slate-800 font-['Inter',sans-serif] selection:bg-indigo-100 antialiased overflow-hidden">
            {/* Sidebar */}
            <aside className="w-56 bg-white border-r border-slate-100 flex flex-col shrink-0 z-50">
                <div className="p-8 pb-10 flex items-center gap-3">
                    <div className="w-7 h-7 bg-indigo-600 text-white flex items-center justify-center font-bold text-sm rounded-xl shadow-lg shadow-indigo-100 italic">m</div>
                    <span className="text-[13px] tracking-widest text-slate-900 font-bold lowercase">msajce</span>
                </div>
                
                <nav className="flex-1 px-3 space-y-1 mt-2">
                    {nav.map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => setActivePanel(item.id)} 
                            className={`w-full flex items-center justify-between px-5 py-3 rounded-2xl transition-all duration-200 group ${
                                activePanel === item.id 
                                ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <span className={`w-4 shrink-0 flex justify-center ${activePanel === item.id ? "text-indigo-600" : "text-slate-300"}`}>
                                    {item.icon && <item.icon size={16} strokeWidth={2} />}
                                </span>
                                <span className="text-[14px] font-medium lowercase tracking-tight">{item.label}</span>
                            </div>
                            {item.badge > 0 && <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{item.badge}</span>}
                        </button>
                    ))}
                </nav>

                <div className="p-8">
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold lowercase mb-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                            sys active
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium lowercase tracking-tight">v9.1.0 / {lastSync}</div>
                    </div>
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-500 font-medium lowercase tracking-wide">{activeBot} control // {activePanel} management</span>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="flex bg-slate-50 p-1 rounded-xl gap-1 border border-slate-100">
                            <button onClick={() => setActiveBot('assistant')} className={`px-6 py-2 rounded-lg text-xs lowercase font-medium transition-all ${activeBot === 'assistant' ? 'bg-white text-slate-900 shadow-md border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>assistant</button>
                            <button onClick={() => setActiveBot('grievance')} className={`px-6 py-2 rounded-lg text-xs lowercase font-medium transition-all ${activeBot === 'grievance' ? 'bg-white text-slate-900 shadow-md border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>grievance</button>
                        </div>
                        <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-100 transition-all border border-slate-200 shadow-sm">
                            <User size={18} />
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-[#fafbfc]">
                    {/* Content */}
                    {activePanel === 'overview' && (
                        <div className="space-y-8 max-w-[1600px] mx-auto">
                            <div className="flex gap-6">
                                <MetricCard label={activeBot === 'grievance' ? 'total users' : 'queries processed'} value={activeBot === 'grievance' ? stats?.users?.total : monitorData?.metrics?.assistant?.total_requests} icon={Users} color="indigo" />
                                <MetricCard label={activeBot === 'grievance' ? 'active tickets' : 'success throughput'} value={activeBot === 'grievance' ? stats?.complaints?.total : `${monitorData?.metrics?.assistant?.success_rate || 100}%`} icon={BarChart3} color="emerald" />
                                <MetricCard label={activeBot === 'grievance' ? 'emergency triggers' : 'system errors'} value={activeBot === 'grievance' ? stats?.complaints?.emergency : monitorData?.metrics?.assistant?.total_errors} icon={AlertCircle} color="rose" />
                                <MetricCard label="avg resolution" value={activeBot === 'grievance' ? stats?.complaints?.avg_resolution : (monitorData?.metrics?.assistant?.avg_latency || 0).toFixed(0)} unit={activeBot === 'grievance' ? 'h' : 'ms'} icon={Clock} color="amber" />
                            </div>

                            <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden">
                                <div className="px-10 py-6 border-b border-slate-50 bg-slate-50/20 flex items-center justify-between">
                                    <h3 className="text-xs text-slate-500 font-bold lowercase tracking-widest flex items-center gap-3">
                                        <TerminalIcon size={16} strokeWidth={2} className="text-indigo-400" /> realtime system feed
                                    </h3>
                                    <div className="text-[10px] text-indigo-400 font-bold lowercase px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full">active node bridge</div>
                                </div>
                                <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto custom-scrollbar">
                                    {(monitorData.logs || []).slice(0, 50).map((log, ix) => (
                                        <div key={ix} className="flex gap-12 text-[13px] items-center px-10 py-5 hover:bg-slate-50/50 transition-colors">
                                            <span className="text-slate-300 w-16 shrink-0 font-medium">{new Date(log.timestamp || Date.now()).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
                                            <span className={`text-[10px] lowercase font-bold px-3 py-0.5 rounded-lg border ${log.bot === 'assistant' ? 'border-indigo-100 bg-indigo-50 text-indigo-500' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>{log.bot}</span>
                                            <span className="text-slate-600 font-medium truncate tracking-tight">{log.message}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activePanel === 'grievance' && (
                        <div className="space-y-6 max-w-4xl mx-auto">
                            {complaints.filter(cl => cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected').map(cl => (
                                <div key={cl.complaint_id} className="bg-white border border-slate-100 rounded-[2.5rem] p-10 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex justify-between items-center mb-6">
                                        <span className="text-xs text-rose-500 font-bold lowercase tracking-wide flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span> {cl.category}
                                        </span>
                                        <span className="text-[11px] text-slate-300 font-medium lowercase">{cl.complaint_id}</span>
                                    </div>
                                    <p className="text-lg font-light text-slate-700 mb-8 leading-relaxed border-l-[3px] border-slate-50 pl-8">{cl.description}</p>
                                    <div className="grid grid-cols-3 gap-6 text-xs text-slate-500 mb-10 lowercase font-medium">
                                        <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl"><MapPin size={16} /> <span>{cl.location || 'campus'}</span></div>
                                        <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl"><Clock size={16} /> <span>{new Date(cl.created_at).toLocaleTimeString()}</span></div>
                                        <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl"><UserCircle size={16} /> <span>{cl.is_anonymous ? 'anon' : (cl.student_id?.name || 'user')}</span></div>
                                    </div>
                                    <button onClick={() => handle(cl.complaint_id, 'resolve')} className="w-full bg-slate-900 text-white py-4 rounded-[1.5rem] text-sm font-medium lowercase hover:bg-black transition-all shadow-xl active:scale-[0.98]">resolve incident</button>
                                </div>
                            ))}
                        </div>
                    )}

                    {(activePanel === 'tickets' || activePanel === 'history' || activePanel === 'users') && (
                        <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden text-sm font-medium lowercase text-slate-600 max-w-[1600px] mx-auto">
                            <table className="w-full text-left">
                                <thead className="text-[11px] text-slate-400 uppercase tracking-widest border-b border-slate-50 bg-slate-50/20">
                                    <tr>
                                        {activePanel === 'users' ? (<><th className="px-10 py-8 font-bold">identity index</th><th className="px-10 py-8 font-bold">department</th><th className="px-10 py-8 text-right font-bold">status</th></>) : 
                                         activePanel === 'history' ? (<><th className="px-10 py-8 font-bold">id</th><th className="px-10 py-8 font-bold">result</th><th className="px-10 py-8 text-right font-bold">timestamp</th></>) :
                                         (<><th className="px-10 py-8 font-bold">id</th><th className="px-10 py-8 font-bold">status</th><th className="px-10 py-8 font-bold">dept</th><th className="px-10 py-8 text-right font-bold">actions</th></>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {activePanel === 'tickets' ? complaints.filter(cl => !cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected').map(cl => (
                                        <tr key={cl.complaint_id} className="hover:bg-slate-50 transition-colors">
                                             <td className="px-10 py-6 text-slate-900 font-bold tracking-tighter">{cl.complaint_id}</td>
                                             <td className="px-10 py-6 tracking-tight font-medium text-slate-400">{cl.status.replace('_',' ')}</td>
                                             <td className="px-10 py-6">{cl.category}</td>
                                             <td className="px-10 py-6 text-right space-x-8">
                                                 <button onClick={() => handle(cl.complaint_id, 'resolve')} className="text-emerald-500 hover:text-emerald-700 font-bold transition-all">approve</button>
                                                 <button onClick={() => handle(cl.complaint_id, 'reject')} className="text-rose-400 hover:text-rose-600 font-bold transition-all">reject</button>
                                             </td>
                                        </tr>
                                    )) : activePanel === 'history' ? complaints.filter(cl => cl.status === 'resolved' || cl.status === 'rejected').map(cl => (
                                        <tr key={cl.complaint_id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-10 py-6 text-slate-800 font-bold">{cl.complaint_id}</td>
                                            <td className="px-10 py-6">
                                                <span className={`px-4 py-1 rounded-xl text-[10px] font-bold ${cl.status === 'resolved' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>{cl.status}</span>
                                            </td>
                                            <td className="px-10 py-6 text-right text-slate-300 font-medium tracking-tight">{new Date(cl.updated_at).toLocaleDateString()}</td>
                                        </tr>
                                    )) : users.map(u => (
                                        <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-10 py-6 text-slate-900 font-bold flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">{u.name?.substring(0,1) || "U"}</div>
                                                {u.name || "unidentified user"}
                                            </td>
                                            <td className="px-10 py-6 font-medium text-slate-500">{u.department || 'general'}</td>
                                            <td className="px-10 py-6 text-right font-bold text-[10px] uppercase">
                                                {u.verified ? <span className="text-emerald-500">verified</span> : <span className="text-slate-300">pending</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;
