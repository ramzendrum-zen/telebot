/* VERSION 9.0.0 - MSAJCE TERMINAL - HYPER MINIMALIST SUITE */
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
        indigo: 'text-indigo-500',
        emerald: 'text-emerald-500',
        rose: 'text-rose-500',
        amber: 'text-amber-500',
        slate: 'text-slate-400'
    };
    return (
        <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-sm hover:border-slate-200 transition-colors flex-1 min-w-[200px]">
            <div className="flex items-center gap-3 mb-2">
                <div className={`${colors[color] || colors.slate}`}>
                    {Icon ? <Icon size={14} strokeWidth={1.5} /> : <Activity size={14} strokeWidth={1.5} />}
                </div>
                <span className="text-[10px] text-slate-400 font-normal lowercase tracking-wide">{label}</span>
            </div>
            <div className="text-xl text-slate-900 font-light tracking-tight">
                {value ?? 0}<span className="text-xs ml-1 text-slate-400 font-normal">{unit}</span>
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

    if (loading && !stats) return <div className="min-h-screen bg-white flex items-center justify-center text-[10px] text-slate-300 font-light lowercase tracking-widest">initialising node...</div>;

    return (
        <div className="flex h-screen bg-[#fafbfc] text-slate-800 font-['Inter',sans-serif] selection:bg-slate-100 antialiased overflow-hidden">
            {/* Sidebar */}
            <aside className="w-52 bg-white border-r border-slate-100 flex flex-col shrink-0 z-50">
                <div className="p-6 pb-8 flex items-center gap-2">
                    <div className="w-6 h-6 bg-slate-900 text-white flex items-center justify-center font-normal text-xs rounded-lg">m</div>
                    <span className="text-[11px] tracking-widest text-slate-900 font-medium lowercase">msajce</span>
                </div>
                
                <nav className="flex-1 px-2 space-y-0.5 mt-2">
                    {nav.map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => setActivePanel(item.id)} 
                            className={`w-full flex items-center justify-between px-4 py-2 rounded-lg transition-all duration-200 group ${
                                activePanel === item.id 
                                ? 'bg-slate-100 text-slate-900 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <span className={`w-4 shrink-0 flex justify-center ${activePanel === item.id ? "text-indigo-500" : "text-slate-300"}`}>
                                    {item.icon && <item.icon size={13} strokeWidth={2} />}
                                </span>
                                <span className="text-[12px] font-normal lowercase">{item.label}</span>
                            </div>
                            {item.badge > 0 && <span className="bg-rose-100 text-rose-500 text-[9px] px-1.5 py-0.5 rounded-full">{item.badge}</span>}
                        </button>
                    ))}
                </nav>

                <div className="p-6">
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-normal lowercase mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                            online
                        </div>
                        <div className="text-[8px] text-slate-300 font-light lowercase tracking-tight">sync {lastSync}</div>
                    </div>
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-8 shrink-0">
                    <div className="flex items-center gap-4">
                        <span className="text-[11px] text-slate-400 font-normal lowercase tracking-wide">{activeBot} bot / {activePanel} management</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex bg-slate-50 p-0.5 rounded-lg gap-0.5 border border-slate-100">
                            <button onClick={() => setActiveBot('assistant')} className={`px-4 py-1 rounded-md text-[10px] lowercase font-normal transition-all ${activeBot === 'assistant' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>assistant</button>
                            <button onClick={() => setActiveBot('grievance')} className={`px-4 py-1 rounded-md text-[10px] lowercase font-normal transition-all ${activeBot === 'grievance' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>grievance</button>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 cursor-pointer hover:bg-slate-100 transition-all border border-slate-100">
                            <User size={14} />
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {/* Content */}
                    {activePanel === 'overview' && (
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <MetricCard label={activeBot === 'grievance' ? 'total users' : 'queries'} value={activeBot === 'grievance' ? stats?.users?.total : monitorData?.metrics?.assistant?.total_requests} icon={Users} color="indigo" />
                                <MetricCard label={activeBot === 'grievance' ? 'tickets' : 'throughput'} value={activeBot === 'grievance' ? stats?.complaints?.total : `${monitorData?.metrics?.assistant?.success_rate || 100}%`} icon={BarChart3} color="emerald" />
                                <MetricCard label={activeBot === 'grievance' ? 'emergency' : 'errors'} value={activeBot === 'grievance' ? stats?.complaints?.emergency : monitorData?.metrics?.assistant?.total_errors} icon={AlertCircle} color="rose" />
                                <MetricCard label="avg res" value={activeBot === 'grievance' ? stats?.complaints?.avg_resolution : (monitorData?.metrics?.assistant?.avg_latency || 0).toFixed(0)} unit={activeBot === 'grievance' ? 'h' : 'ms'} icon={Clock} color="amber" />
                            </div>

                            <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                                    <h3 className="text-[10px] text-slate-400 font-normal lowercase tracking-widest flex items-center gap-2">
                                        <TerminalIcon size={12} strokeWidth={1} /> realtime telemetry stream
                                    </h3>
                                    <div className="text-[9px] text-slate-300 lowercase px-2 py-0.5 border border-slate-100 rounded-full">live node link</div>
                                </div>
                                <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {(monitorData.logs || []).slice(0, 30).map((log, ix) => (
                                        <div key={ix} className="flex gap-10 text-[11px] items-center px-6 py-3.5 hover:bg-slate-50 transition-colors">
                                            <span className="text-slate-300 w-12 shrink-0 font-light">{new Date(log.timestamp || Date.now()).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
                                            <span className={`text-[8px] lowercase font-normal px-2 py-0.5 rounded-full border ${log.bot === 'assistant' ? 'border-indigo-100 bg-indigo-50 text-indigo-400' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>{log.bot}</span>
                                            <span className="text-slate-500 font-light truncate">{log.message}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activePanel === 'grievance' && (
                        <div className="space-y-4 max-w-2xl mx-auto">
                            {complaints.filter(cl => cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected').map(cl => (
                                <div key={cl.complaint_id} className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-[10px] text-rose-500 font-normal lowercase tracking-wide">{cl.category}</span>
                                        <span className="text-[9px] text-slate-200 lowercase">{cl.complaint_id}</span>
                                    </div>
                                    <p className="text-sm font-light text-slate-600 mb-6 leading-relaxed border-l border-slate-100 pl-4">{cl.description}</p>
                                    <div className="flex gap-4 text-[10px] text-slate-400 mb-6 lowercase font-light">
                                        <span className="flex items-center gap-1.5"><MapPin size={12} /> {cl.location || 'campus'}</span>
                                        <span className="flex items-center gap-1.5"><Clock size={12} /> {new Date(cl.created_at).toLocaleTimeString()}</span>
                                        <span className="flex items-center gap-1.5"><UserCircle size={12} /> {cl.is_anonymous ? 'anon' : (cl.student_id?.name || 'user')}</span>
                                    </div>
                                    <button onClick={() => handle(cl.complaint_id, 'resolve')} className="w-full bg-slate-900 text-white py-2.5 rounded-lg text-xs font-light lowercase hover:bg-black transition-all">resolve incident</button>
                                </div>
                            ))}
                        </div>
                    )}

                    {(activePanel === 'tickets' || activePanel === 'history' || activePanel === 'users') && (
                        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden text-[11px] font-light lowercase text-slate-500">
                            <table className="w-full text-left">
                                <thead className="text-[9px] text-slate-300 uppercase tracking-widest border-b border-slate-50">
                                    <tr>
                                        {activePanel === 'users' ? (<><th className="px-6 py-4 font-normal">identity</th><th className="px-6 py-4 font-normal">dept</th><th className="px-6 py-4 text-right">status</th></>) : 
                                         activePanel === 'history' ? (<><th className="px-6 py-4 font-normal">id</th><th className="px-6 py-4 font-normal">state</th><th className="px-6 py-4 text-right">date</th></>) :
                                         (<><th className="px-6 py-4 font-normal">id</th><th className="px-6 py-4 font-normal">status</th><th className="px-6 py-4 font-normal">dept</th><th className="px-6 py-4 text-right">actions</th></>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {activePanel === 'tickets' ? complaints.filter(cl => !cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected').map(cl => (
                                        <tr key={cl.complaint_id} className="hover:bg-slate-50 transition-colors">
                                             <td className="px-6 py-3.5 text-slate-800 font-normal">{cl.complaint_id}</td>
                                             <td className="px-6 py-3.5 text-slate-400">{cl.status}</td>
                                             <td className="px-6 py-3.5">{cl.category}</td>
                                             <td className="px-6 py-3.5 text-right space-x-3">
                                                 <button onClick={() => handle(cl.complaint_id, 'resolve')} className="text-emerald-500 hover:underline">approve</button>
                                                 <button onClick={() => handle(cl.complaint_id, 'reject')} className="text-rose-400 hover:underline">reject</button>
                                             </td>
                                        </tr>
                                    )) : activePanel === 'history' ? complaints.filter(cl => cl.status === 'resolved' || cl.status === 'rejected').map(cl => (
                                        <tr key={cl.complaint_id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-3 text-slate-800">{cl.complaint_id}</td>
                                            <td className={`px-6 py-3 ${cl.status === 'resolved' ? 'text-emerald-400' : 'text-rose-300'}`}>{cl.status}</td>
                                            <td className="px-6 py-3 text-right text-slate-300 font-light">{new Date(cl.updated_at).toLocaleDateString()}</td>
                                        </tr>
                                    )) : users.map(u => (
                                        <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-3 text-slate-800">{u.name || "sys user"}</td>
                                            <td className="px-6 py-3">{u.department || 'general'}</td>
                                            <td className="px-6 py-3 text-right">{u.verified ? 'verified' : 'pending'}</td>
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
