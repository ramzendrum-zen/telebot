/* VERSION 12.0.0 - MSAJCE TERMINAL - UNIFIED ONE-BY-ONE */
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
    Activity, Home, Settings, Cpu, Inbox, Shield, History, 
    UserCircle, Users, Bell, AlertCircle, Clock, Terminal, 
    BarChart3, MapPin, User, ChevronRight, AlertOctagon, Zap,
    MoreHorizontal, CheckCircle, XCircle, Globe, Layers, Command,
    ExternalLink, Filter, Search, Terminal as TerminalIcon, Mail, Briefcase,
    Calendar, Watch, ShieldAlert
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

    if (loading && !stats) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-[11px] font-bold text-slate-300 uppercase tracking-widest">establishing secure link...</div>;

    const botLogs = (monitorData.logs || []).filter(l => l.bot === activeBot);
    const activeTickets = complaints.filter(cl => !cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected');
    const emergencyList = complaints.filter(cl => cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected');
    const pastHistory = complaints.filter(cl => cl.status === 'resolved' || cl.status === 'rejected');

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
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            secure_gateway_online
                        </div>
                        <div className="text-[9px] text-slate-400 font-bold tracking-tight uppercase">v12.0 / {lastSync}</div>
                    </div>
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-10 shrink-0">
                    <div className="flex items-center gap-4 text-sm text-slate-500 font-bold lowercase tracking-wide">
                        {activeBot} kernel / {activePanel} management
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
                        <div className="space-y-8 max-w-[1600px] mx-auto">
                            <div className="flex gap-6">
                                <MetricCard label={activeBot === 'grievance' ? 'total users' : 'requests processed'} value={activeBot === 'grievance' ? stats?.users?.total : monitorData?.metrics?.assistant?.total_requests} icon={Users} color="indigo" />
                                <MetricCard label={activeBot === 'grievance' ? 'active tickets' : 'throughput rate'} value={activeBot === 'grievance' ? stats?.complaints?.total : `${monitorData?.metrics?.assistant?.success_rate || 100}%`} icon={BarChart3} color="emerald" />
                                <MetricCard label={activeBot === 'grievance' ? 'emergency alerts' : 'system errors'} value={activeBot === 'grievance' ? stats?.complaints?.emergency : monitorData?.metrics?.assistant?.total_errors} icon={AlertCircle} color="rose" />
                                <MetricCard label="avg speed" value={activeBot === 'grievance' ? stats?.complaints?.avg_resolution : (monitorData?.metrics?.assistant?.avg_latency || 0).toFixed(0)} unit={activeBot === 'grievance' ? 'h' : 'ms'} icon={Clock} color="amber" />
                            </div>

                            <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden">
                                <div className="px-10 py-6 border-b border-slate-50 bg-slate-50/20">
                                    <h3 className="text-xs text-slate-500 font-bold lowercase tracking-widest flex items-center gap-3">
                                        <TerminalIcon size={16} strokeWidth={2} className="text-indigo-400" /> Recent events feed
                                    </h3>
                                </div>
                                <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto custom-scrollbar">
                                    {botLogs.slice(0, 50).map((log, ix) => (
                                        <div key={ix} className="flex gap-10 text-[13px] items-center px-10 py-4 hover:bg-slate-50/50 transition-colors">
                                            <span className="text-slate-300 w-16 shrink-0 font-bold font-mono text-xs text-right">{new Date(log.timestamp || Date.now()).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
                                            <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-lg border ${log.level === 'error' ? 'border-rose-100 bg-rose-50 text-rose-500' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>{log.level || 'info'}</span>
                                            <span className="text-slate-600 font-medium truncate tracking-tight">{log.message}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activePanel === 'analytics' && (
                        <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden max-w-[1600px] mx-auto animate-in fade-in duration-500">
                            <table className="w-full text-left">
                                <thead className="text-[11px] text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-slate-50/30">
                                    <tr>
                                        <th className="px-10 py-8 font-black">Event timestamp</th>
                                        <th className="px-10 py-8 font-black">Log level</th>
                                        <th className="px-10 py-8 font-black flex items-center gap-2">Diagnostic message</th>
                                        <th className="px-10 py-8 text-right font-black">Node index</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {botLogs.map((log, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-all font-medium text-slate-600 text-[13px]">
                                            <td className="px-10 py-6 font-bold text-slate-400 font-mono flex items-center gap-3">
                                                <Calendar size={12} className="text-slate-200" /> {new Date(log.timestamp).toLocaleDateString()}
                                                <Watch size={12} className="text-slate-200 ml-2" /> {new Date(log.timestamp).toLocaleTimeString([], { hour12:false })}
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${log.level === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100 shadow-sm shadow-rose-50' : 'bg-slate-50 text-slate-400'}`}>{log.level || 'info'}</span>
                                            </td>
                                            <td className={`px-10 py-6 tracking-tight ${log.level === 'error' ? 'text-rose-700 font-bold' : 'text-slate-600'}`}>{log.message}</td>
                                            <td className="px-10 py-6 text-right text-slate-200 font-black font-mono">NODE_BUF_{i}</td>
                                        </tr>
                                    ))}
                                    {botLogs.length === 0 && <tr><td colSpan="4" className="py-40 text-center text-xs text-slate-300 font-bold uppercase tracking-[0.4em] italic">No telemetry data archived</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activePanel === 'users' && (
                        <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden max-w-[1600px] mx-auto animate-in fade-in duration-500">
                             <table className="w-full text-left">
                                <thead className="text-[11px] text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-slate-50/30">
                                    <tr>
                                        <th className="px-10 py-8 font-black">Primary identity</th>
                                        <th className="px-10 py-8 font-black">Communication index</th>
                                        <th className="px-10 py-8 font-black">Operational department</th>
                                        <th className="px-10 py-8 text-right font-black">Verification status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {users.map(u => (
                                        <tr key={u._id} className="hover:bg-slate-50 transition-all font-medium text-slate-600 text-[14px]">
                                            <td className="px-10 py-6 font-bold text-slate-800 flex items-center gap-5">
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center font-black shadow-sm">{u.name?.substring(0,1) || "U"}</div>
                                                <span className="tracking-tight">{u.name || "unidentified_user"}</span>
                                            </td>
                                            <td className="px-10 py-6 text-slate-400 font-bold lowercase flex items-center gap-3 mt-3">
                                                <Mail size={12} className="text-slate-200" /> {u.email || 'no_linked_index'}
                                            </td>
                                            <td className="px-10 py-6 uppercase font-bold text-slate-300 text-[10px] tracking-widest italic">{u.department || 'general_ops'}</td>
                                            <td className="px-10 py-6 text-right">
                                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${u.verified ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-slate-50 text-slate-200 border-slate-100'}`}>{u.verified ? 'Verified' : 'Pending'}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    )}

                    {(activePanel === 'tickets' || activePanel === 'history' || activePanel === 'grievance') && (
                        <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden max-w-[1600px] mx-auto animate-in fade-in duration-500">
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
                                    {(activePanel === 'tickets' ? activeTickets : activePanel === 'grievance' ? emergencyList : pastHistory).map(cl => (
                                        <tr key={cl._id} className="hover:bg-slate-50/50 transition-all font-medium text-slate-600 text-[14px]">
                                            <td className="px-10 py-7 font-black text-blue-600 font-mono tracking-tighter flex items-center gap-3">
                                                {activeBox === 'grievance' && cl.is_emergency && <ShieldAlert size={14} className="text-rose-500" />}
                                                {formatId(cl.complaint_id)}
                                            </td>
                                            <td className="px-10 py-7">
                                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${cl.status === 'resolved' ? 'bg-emerald-50 text-emerald-500' : cl.status === 'rejected' ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400'}`}>{cl.status.replace('_',' ')}</span>
                                            </td>
                                            <td className="px-10 py-7 font-bold text-slate-400 lowercase">{cl.category}</td>
                                            <td className="px-10 py-7 text-right space-x-6">
                                                {(activePanel === 'tickets' || activePanel === 'grievance') ? (
                                                    <><button onClick={() => handle(cl.complaint_id, 'resolve')} className="text-emerald-500 hover:text-emerald-700 font-bold uppercase text-[11px] tracking-widest border-b-2 border-transparent hover:border-emerald-500">Approve</button>
                                                    <button onClick={() => handle(cl.complaint_id, 'reject')} className="text-rose-400 hover:text-rose-600 font-bold uppercase text-[11px] tracking-widest border-b-2 border-transparent hover:border-rose-400">Reject</button></>
                                                ) : <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest italic">{new Date(cl.updated_at).toLocaleDateString()}</span>}
                                            </td>
                                        </tr>
                                    ))}
                                    {((activePanel === 'tickets' && activeTickets.length === 0) || (activePanel === 'history' && pastHistory.length === 0) || (activePanel === 'grievance' && emergencyList.length === 0)) && (
                                        <tr><td colSpan="4" className="py-40 text-center text-xs text-slate-300 font-bold uppercase tracking-[0.4em] italic">No archived entries index found</td></tr>
                                    )}
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
