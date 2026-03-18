/* VERSION 11.0.0 - MSAJCE TERMINAL - PRECISION TELEMETRY */
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
    Activity, Home, Settings, Cpu, Inbox, Shield, History, 
    UserCircle, Users, Bell, AlertCircle, Clock, Terminal, 
    BarChart3, MapPin, User, ChevronRight, AlertOctagon, Zap,
    MoreHorizontal, CheckCircle, XCircle, Globe, Layers, Command,
    ExternalLink, Filter, Search, Terminal as TerminalIcon, Mail, Briefcase,
    Calendar, Watch
} from 'lucide-react';

const MetricCard = ({ label, value, icon: Icon, color = "slate", unit = "" }) => {
    const colors = {
        indigo: 'text-indigo-600',
        emerald: 'text-emerald-500',
        rose: 'text-rose-600',
        amber: 'text-amber-500',
        slate: 'text-slate-500'
    };
    return (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:border-indigo-100 transition-all flex-1 min-w-[220px]">
            <div className="flex items-center gap-3 mb-3">
                <div className={`${colors[color] || colors.slate}`}>
                    {Icon ? <Icon size={16} strokeWidth={2} /> : <Activity size={16} strokeWidth={2} />}
                </div>
                <span className="text-[12px] text-slate-500 font-bold uppercase tracking-tight">{label}</span>
            </div>
            <div className="text-2xl text-slate-800 font-bold tracking-tighter">
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
            { id: 'overview', label: 'Dashboard overview', icon: Home },
            { id: 'analytics', label: 'System analytics', icon: Activity },
            { id: 'settings', label: 'Admin settings', icon: Settings },
        ];
        if (activeBot === 'assistant') {
            return [ common[0], { id: 'assistant', label: 'Academic assistant', icon: Cpu }, common[1], common[2] ];
        }
        return [ 
            common[0], 
            { id: 'tickets', label: 'Active tickets', icon: Inbox }, 
            { id: 'grievance', label: 'Emergency alerts', icon: Shield, badge: (complaints || []).filter(cl => cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected').length }, 
            { id: 'users', label: 'User database', icon: UserCircle }, 
            { id: 'history', label: 'Archive history', icon: History },
            common[1], 
            common[2] 
        ];
    }, [activeBot, complaints]);

    const formatId = (id) => {
        if (!id) return 'GRV-UNKNOWN';
        const rawId = id.startsWith('grv-') ? id : `grv-${id.substring(id.length - 4)}`;
        return rawId.toUpperCase();
    };

    const handle = async (id, action) => {
        try { await axios.post(`/api/admin/complaints/${id}/action`, { action }); pull(); } catch (e) {}
    };

    if (loading && !stats) return <div className="min-h-screen bg-white flex items-center justify-center text-[11px] font-bold text-slate-300 uppercase tracking-widest">Initialising telemetry node...</div>;

    const botLogs = (monitorData.logs || []).filter(l => l.bot === activeBot);

    return (
        <div className="flex h-screen bg-[#fafbfc] text-slate-800 font-['Inter',sans-serif] selection:bg-indigo-100 antialiased overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-100 flex flex-col shrink-0 z-50">
                <div className="p-8 pb-10 flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-900 text-white flex items-center justify-center font-bold text-sm rounded-xl">M</div>
                    <span className="text-[14px] tracking-widest text-slate-900 font-black uppercase">MSAJCE</span>
                </div>
                
                <nav className="flex-1 px-3 space-y-1">
                    {nav.map(item => (
                        <button key={item.id} onClick={() => setActivePanel(item.id)} className={`w-full flex items-center justify-between px-5 py-3 rounded-2xl transition-all duration-200 group ${activePanel === item.id ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
                            <div className="flex items-center gap-4">
                                <span className={`w-4 shrink-0 flex justify-center ${activePanel === item.id ? "text-indigo-600" : "text-slate-300"}`}>
                                    {item.icon && <item.icon size={15} strokeWidth={2} />}
                                </span>
                                <span className="text-[13px] font-semibold tracking-tight">{item.label}</span>
                            </div>
                            {item.badge > 0 && <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{item.badge}</span>}
                        </button>
                    ))}
                </nav>

                <div className="p-8">
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 italic">
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold lowercase mb-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                            node-gateway-active
                        </div>
                        <div className="text-[9px] text-slate-400 font-bold tracking-tight uppercase">v11.0 / {lastSync}</div>
                    </div>
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-10 shrink-0">
                    <div className="flex items-center gap-4 text-sm text-slate-500 font-bold lowercase tracking-wide">
                        {activeBot} control center / {activePanel}
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex bg-slate-50 p-1.5 rounded-xl gap-1 border border-slate-200">
                            <button onClick={() => setActiveBot('assistant')} className={`px-8 py-2 rounded-lg text-xs font-bold uppercase transition-all ${activeBot === 'assistant' ? 'bg-white text-slate-900 shadow-xl border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>Assistant</button>
                            <button onClick={() => setActiveBot('grievance')} className={`px-8 py-2 rounded-lg text-xs font-bold uppercase transition-all ${activeBot === 'grievance' ? 'bg-white text-slate-900 shadow-xl border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>Grievance</button>
                        </div>
                        <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 cursor-pointer shadow-sm">
                            <User size={18} />
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-[#fafbfc]">
                    {activePanel === 'overview' && (
                        <div className="space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
                            <div className="flex gap-6">
                                <MetricCard label={activeBot === 'grievance' ? 'total users' : 'requests processed'} value={activeBot === 'grievance' ? stats?.users?.total : monitorData?.metrics?.assistant?.total_requests} icon={Users} color="indigo" />
                                <MetricCard label={activeBot === 'grievance' ? 'active tickets' : 'throughput rate'} value={activeBot === 'grievance' ? stats?.complaints?.total : `${monitorData?.metrics?.assistant?.success_rate || 100}%`} icon={BarChart3} color="emerald" />
                                <MetricCard label={activeBot === 'grievance' ? 'emergency alerts' : 'system errors'} value={activeBot === 'grievance' ? stats?.complaints?.emergency : monitorData?.metrics?.assistant?.total_errors} icon={AlertCircle} color="rose" />
                                <MetricCard label="avg speed" value={activeBot === 'grievance' ? stats?.complaints?.avg_resolution : (monitorData?.metrics?.assistant?.avg_latency || 0).toFixed(0)} unit={activeBot === 'grievance' ? 'h' : 'ms'} icon={Clock} color="amber" trend="+0.1%" />
                            </div>

                            <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden">
                                <div className="px-10 py-6 border-b border-slate-50 bg-slate-50/20 flex items-center justify-between">
                                    <h3 className="text-xs text-slate-500 font-bold lowercase tracking-widest flex items-center gap-3">
                                        <TerminalIcon size={16} strokeWidth={2} className="text-indigo-400" /> Recent events feed
                                    </h3>
                                </div>
                                <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {botLogs.slice(0, 30).map((log, ix) => (
                                        <div key={ix} className="flex gap-10 text-[13px] items-center px-10 py-4 hover:bg-slate-50/50 transition-colors">
                                            <span className="text-slate-300 w-16 shrink-0 font-bold font-mono text-xs">{new Date(log.timestamp || Date.now()).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
                                            <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-lg border ${log.level === 'error' ? 'border-rose-100 bg-rose-50 text-rose-500' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>{log.level || 'info'}</span>
                                            <span className="text-slate-600 font-medium truncate tracking-tight">{log.message}</span>
                                        </div>
                                    ))}
                                    {botLogs.length === 0 && <div className="py-20 text-center text-xs text-slate-300 font-bold lowercase tracking-widest italic">No activities recorded for this bot</div>}
                                </div>
                            </div>
                        </div>
                    )}

                    {activePanel === 'analytics' && (
                        <div className="space-y-4 max-w-5xl mx-auto animate-in fade-in duration-500">
                             {botLogs.map((log, i) => (
                                <div key={i} className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:border-indigo-100 transition-all flex items-center gap-8 group">
                                    <div className={`w-12 h-12 flex items-center justify-center rounded-2xl ${log.level === 'error' ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400'}`}>
                                        {log.level === 'error' ? <AlertOctagon size={20} /> : <TerminalIcon size={20} />}
                                    </div>
                                    <div className="flex flex-col gap-1 flex-1">
                                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(log.timestamp).toLocaleDateString()}</span>
                                            <span className="flex items-center gap-1"><Watch size={12} /> {new Date(log.timestamp).toLocaleTimeString([], { hour12:false })}</span>
                                            <span className={`px-2 py-0.5 rounded-lg border ${log.level === 'error' ? 'border-rose-100 bg-rose-50 text-rose-600' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>{log.level || 'trace'}</span>
                                        </div>
                                        <p className={`text-sm font-medium tracking-tight ${log.level === 'error' ? 'text-rose-700' : 'text-slate-600'}`}>{log.message}</p>
                                    </div>
                                    <div className="text-[10px] text-slate-200 font-black font-mono">NODE_#{i}</div>
                                </div>
                             ))}
                             {botLogs.length === 0 && <div className="py-40 text-center text-xs text-slate-300 font-black lowercase tracking-[0.5em] italic">Telemetry_Stream_Empty</div>}
                        </div>
                    )}

                    {activePanel === 'users' && (
                        <div className="flex flex-col gap-4 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-500">
                            {users.map(u => (
                                <div key={u._id} className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:border-indigo-100 transition-all flex items-center justify-between group">
                                    <div className="flex items-center gap-6">
                                        <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center font-black text-lg group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm leading-none">{u.name?.substring(0,1) || "U"}</div>
                                        <div className="flex flex-col gap-0.5">
                                            <h4 className="text-base font-bold text-slate-900 tracking-tight">{u.name || "sys user"}</h4>
                                            <div className="flex items-center gap-4 text-[11px] text-slate-400 font-medium">
                                                <span className="flex items-center gap-1.5"><Mail size={12} /> {u.email || 'no-email'}</span>
                                                <span className="flex items-center gap-1.5 uppercase font-bold text-slate-300 tracking-wider">/ {u.department || 'general'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <span className="text-[10px] text-slate-300 font-black tracking-widest uppercase">{u._id?.substring(u._id.length - 8)}</span>
                                        <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${u.verified ? 'bg-emerald-50 text-emerald-500 border-emerald-100 font-bold' : 'bg-slate-50 text-slate-200 border-slate-100'}`}>{u.verified ? 'Verified' : 'Pending'}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {(activePanel === 'tickets' || activePanel === 'history') && (
                        <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="text-[11px] text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-slate-50/30">
                                    <tr>
                                        <th className="px-10 py-8 font-black">Identification</th>
                                        <th className="px-10 py-8 font-black">Current state</th>
                                        <th className="px-10 py-8 font-black">Operational dept</th>
                                        <th className="px-10 py-8 text-right font-black">Management suite</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {complaints.filter(cl => (!cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected') || (activePanel === 'history' && (cl.status === 'resolved' || cl.status === 'rejected'))).filter(cl => activePanel === 'history' ? (cl.status === 'resolved' || cl.status === 'rejected') : true).map(cl => (
                                        <tr key={cl._id} className="hover:bg-slate-50/50 transition-all font-medium text-slate-600 text-[14px]">
                                            <td className="px-10 py-7 font-black text-blue-600 font-mono tracking-tighter">{formatId(cl.complaint_id)}</td>
                                            <td className="px-10 py-7">
                                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${cl.status === 'resolved' ? 'bg-emerald-50 text-emerald-500 font-bold' : cl.status === 'rejected' ? 'bg-rose-50 text-rose-500 font-bold' : 'bg-slate-50 text-slate-400'}`}>{cl.status.replace('_',' ')}</span>
                                            </td>
                                            <td className="px-10 py-7 font-bold text-slate-400 lowercase">{cl.category}</td>
                                            <td className="px-10 py-7 text-right space-x-6">
                                                {activePanel === 'tickets' ? (
                                                    <><button onClick={() => handle(cl.complaint_id, 'resolve')} className="text-emerald-500 hover:text-emerald-700 font-bold uppercase text-[11px] tracking-widest border-b-2 border-transparent hover:border-emerald-500">Approve</button>
                                                    <button onClick={() => handle(cl.complaint_id, 'reject')} className="text-rose-400 hover:text-rose-600 font-bold uppercase text-[11px] tracking-widest border-b-2 border-transparent hover:border-rose-400">Reject</button></>
                                                ) : <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest italic">{new Date(cl.updated_at).toLocaleDateString()}</span>}
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
