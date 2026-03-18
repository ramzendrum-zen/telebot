/* VERSION 8.0.0 - MSAJCE TERMINAL - PREMIUM OPERATIONAL SUITE */
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
    Activity, Home, Settings, Cpu, Inbox, Shield, History, 
    UserCircle, Users, Bell, AlertCircle, Clock, Terminal, 
    BarChart3, MapPin, User, ChevronRight, AlertOctagon, Zap,
    MoreHorizontal, CheckCircle, XCircle, Globe, Layers, Command
} from 'lucide-react';

const PremiumCard = ({ label, value, icon: Icon, color = "blue", unit = "", trend = "+0.2%" }) => {
    const themes = {
        blue: { bg: 'bg-indigo-50/50', icon: 'text-indigo-600', ring: 'group-hover:ring-indigo-100', dot: 'bg-indigo-500' },
        red: { bg: 'bg-rose-50/50', icon: 'text-rose-600', ring: 'group-hover:ring-rose-100', dot: 'bg-rose-500' },
        green: { bg: 'bg-emerald-50/50', icon: 'text-emerald-600', ring: 'group-hover:ring-emerald-100', dot: 'bg-emerald-500' },
        amber: { bg: 'bg-amber-50/50', icon: 'text-amber-600', ring: 'group-hover:ring-amber-100', dot: 'bg-amber-500' }
    };
    const t = themes[color] || themes.blue;

    return (
        <div className="group relative bg-white border border-slate-100 rounded-[2rem] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.06)] transition-all duration-500 hover:-translate-y-1 flex-1 min-w-[260px]">
            <div className={`absolute top-6 right-6 p-3 rounded-2xl ${t.bg} ${t.icon} ring-4 ring-transparent ${t.ring} transition-all duration-500`}>
                {Icon ? <Icon size={24} strokeWidth={1.5} /> : <Activity size={24} strokeWidth={1.5} />}
            </div>
            
            <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`}></span> {label}
                </span>
                
                <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-light text-slate-900 tracking-tighter">
                        {value ?? 0}
                    </span>
                    <span className="text-sm font-medium text-slate-400 lowercase">{unit}</span>
                </div>
                
                <div className="mt-6 flex items-center gap-3">
                    <div className="flex -space-x-2">
                         {[1,2,3].map(i => <div key={i} className="w-5 h-5 rounded-full bg-slate-100 border-2 border-white"></div>)}
                    </div>
                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">{trend} activity</span>
                </div>
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
            { id: 'overview', label: 'Dashboard Overview', icon: Layers },
            { id: 'analytics', label: 'System Analytics', icon: Activity },
            { id: 'settings', label: 'Terminal Settings', icon: Settings },
        ];
        if (activeBot === 'assistant') {
            return [ common[0], { id: 'assistant', label: 'Academic Assistant', icon: Cpu }, common[1], common[2] ];
        }
        return [ 
            common[0], 
            { id: 'tickets', label: 'Operational Pool', icon: Inbox }, 
            { id: 'grievance', label: 'Emergency Alerts', icon: Shield, badge: (complaints || []).filter(cl => cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected').length }, 
            { id: 'users', label: 'User Index', icon: UserCircle }, 
            { id: 'history', label: 'Service History', icon: History },
            common[1], 
            common[2] 
        ];
    }, [activeBot, complaints]);

    const handle = async (id, action) => {
        try { await axios.post(`/api/admin/complaints/${id}/action`, { action }); pull(); } catch (e) {}
    };

    if (loading && !stats) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8">
            <div className="w-16 h-16 relative">
                 <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                 <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <span className="text-[11px] text-indigo-400 font-bold uppercase tracking-[0.5em] animate-pulse">Initializing Premium Suite</span>
        </div>
    );

    return (
        <div className="flex h-screen bg-[#F8FAFC] text-slate-800 font-['Inter',sans-serif] selection:bg-indigo-100 antialiased overflow-hidden">
            {/* Sidebar */}
            <aside className="w-80 bg-white border-r border-slate-100 flex flex-col shrink-0 z-50 shadow-[20px_0_40px_rgba(0,0,0,0.02)]">
                <div className="p-10 pb-12 flex flex-col gap-10">
                    <div className="flex items-center gap-4 group cursor-pointer">
                        <div className="w-12 h-12 bg-indigo-600 text-white flex items-center justify-center font-black text-xl rounded-3xl shadow-xl shadow-indigo-100 group-hover:rotate-12 transition-transform duration-500">M</div>
                        <div className="flex flex-col">
                            <span className="text-[14px] text-slate-900 font-black tracking-tight uppercase">MSAJCE</span>
                            <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-[0.2em]">Operations</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 px-2">
                        {nav.map(item => (
                            <button 
                                key={item.id} 
                                onClick={() => setActivePanel(item.id)} 
                                className={`group relative w-full flex items-center justify-between px-6 py-4 rounded-[1.5rem] transition-all duration-500 ${
                                    activePanel === item.id 
                                    ? 'bg-slate-950 text-white shadow-2xl shadow-slate-200 translate-x-1' 
                                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1'
                                }`}
                            >
                                <div className="flex items-center gap-5">
                                    <span className={`w-5 shrink-0 transition-all duration-500 ${activePanel === item.id ? "text-indigo-400" : "text-slate-300 group-hover:text-indigo-500"}`}>
                                        {item.icon && <item.icon size={20} strokeWidth={1.5} />}
                                    </span>
                                    <span className="text-[13px] font-medium lowercase tracking-tight">{item.label}</span>
                                </div>
                                {item.badge > 0 && (
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-auto p-8 pt-0">
                    <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Command size={64} />
                        </div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Kernel v8.0.0</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed lowercase mb-4">Service continuity protocols active across all nodes.</p>
                        <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                             <div className="h-full bg-emerald-500 w-3/4 animate-pulse"></div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-28 bg-[#F8FAFC] flex items-center justify-between px-16 shrink-0">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <div className="h-5 w-1.5 bg-indigo-600 rounded-full"></div>
                            <h2 className="text-2xl text-slate-900 font-light tracking-tighter lowercase">{activePanel} management</h2>
                        </div>
                        <div className="text-[11px] text-slate-400 lowercase font-medium tracking-tight ml-4">
                            Operational status: <span className="text-emerald-500">Nominal</span> // Last synchronisation: {lastSync}
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="flex bg-white/50 p-1.5 rounded-[1.5rem] border border-slate-200/50 backdrop-blur-sm shadow-sm">
                            <button onClick={() => setActiveBot('assistant')} className={`px-10 py-3 rounded-2xl text-[12px] lowercase font-semibold transition-all duration-500 ${activeBot === 'assistant' ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>Academic Hub</button>
                            <button onClick={() => setActiveBot('grievance')} className={`px-10 py-3 rounded-2xl text-[12px] lowercase font-semibold transition-all duration-500 ${activeBot === 'grievance' ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>Grievance Portal</button>
                        </div>

                        <div className="flex items-center gap-4 pr-4 border-r border-slate-200">
                             <Bell size={20} className="text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors" />
                             <Globe size={20} className="text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors" />
                        </div>

                        <div className="w-14 h-14 rounded-full bg-indigo-50 border-4 border-indigo-100 flex items-center justify-center text-indigo-600 hover:scale-105 transition-all cursor-pointer shadow-lg">
                            <User size={28} strokeWidth={1.5} />
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-16 pt-8 custom-scrollbar bg-[#F8FAFC]">
                    {/* Render Content */}
                    {activePanel === 'overview' && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-1000">
                            <div className="flex flex-wrap gap-8 items-stretch">
                                <PremiumCard label={activeBot === 'grievance' ? 'registered identities' : 'academic queries'} value={activeBot === 'grievance' ? stats?.users?.total : monitorData?.metrics?.assistant?.total_requests} icon={Users} color="blue" trend="+1.4%" />
                                <PremiumCard label={activeBot === 'grievance' ? 'active tickets' : 'system throughput'} value={activeBot === 'grievance' ? stats?.complaints?.total : `${monitorData?.metrics?.assistant?.success_rate || 99}%`} icon={BarChart3} color="green" trend="+0.8%" />
                                <PremiumCard label={activeBot === 'grievance' ? 'emergency triggers' : 'process errors'} value={activeBot === 'grievance' ? stats?.complaints?.emergency : monitorData?.metrics?.assistant?.total_errors} icon={AlertCircle} color="red" trend="-5.2%" />
                                <PremiumCard label="resolution index" value={activeBot === 'grievance' ? stats?.complaints?.avg_resolution : (monitorData?.metrics?.assistant?.avg_latency || 0).toFixed(0)} unit={activeBot === 'grievance' ? 'h' : 'ms'} icon={Clock} color="amber" trend="+0.1%" />
                            </div>

                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2.5rem] opacity-[0.03] group-hover:opacity-[0.07] transition-opacity blur"></div>
                                <div className="relative bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-[0_4px_30px_rgba(0,0,0,0.025)]">
                                    <div className="flex items-center justify-between mb-10">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                                                <Terminal size={20} strokeWidth={2} />
                                            </div>
                                            <div className="flex flex-col">
                                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-[0.1em]">Pulse Telemetry Feed</h3>
                                                <span className="text-[10px] text-slate-400 font-medium">Monitoring realtime websocket events ...</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                             <div className="px-4 py-2 bg-slate-50 rounded-xl text-[10px] text-slate-500 font-bold uppercase tracking-widest cursor-pointer hover:bg-indigo-600 hover:text-white transition-all">Export Log</div>
                                             <div className="px-4 py-2 bg-slate-50 rounded-xl text-[10px] text-slate-500 font-bold uppercase tracking-widest border border-slate-100">Live: 50/sec</div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-8 custom-scrollbar">
                                        {(monitorData.logs || []).slice(0, 50).map((log, ix) => (
                                            <div key={ix} className="flex gap-12 text-[13px] items-center p-5 hover:bg-indigo-50/30 rounded-3xl transition-all duration-300 border border-transparent hover:border-indigo-100 group/item">
                                                <div className="flex flex-col gap-0.5 w-20 shrink-0">
                                                    <span className="text-[10px] text-slate-300 font-bold font-mono">{new Date(log.timestamp || Date.now()).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
                                                    <span className="text-[8px] text-indigo-400 font-black uppercase tracking-tighter">Event_30{ix}</span>
                                                </div>
                                                <div className={`px-3 py-1 rounded-xl text-[9px] lowercase font-bold border transition-all ${log.bot === 'assistant' ? 'border-indigo-100 bg-indigo-50 text-indigo-600 group-hover/item:bg-indigo-600 group-hover/item:text-white' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>{log.bot} node</div>
                                                <span className="text-slate-700 font-light group-hover/item:translate-x-2 transition-transform">{log.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activePanel === 'grievance' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-right-8 duration-700">
                            {complaints.filter(cl => cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected').map(cl => (
                                <div key={cl.complaint_id} className="relative group">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500 to-orange-500 rounded-[3rem] blur opacity-10 group-hover:opacity-20 transition-opacity duration-1000"></div>
                                    <div className="relative bg-white border border-rose-50 rounded-[3rem] p-12 h-full flex flex-col">
                                        <div className="flex justify-between items-center mb-10">
                                            <div className="px-6 py-2 bg-rose-50 text-rose-600 rounded-2xl text-[10px] lowercase font-black border border-rose-100 tracking-[0.2em]">{cl.category}</div>
                                            <div className="text-[10px] text-slate-300 font-black tracking-[0.3em] uppercase">{cl.complaint_id}</div>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-2xl font-light text-slate-900 mb-12 leading-[1.6] lowercase tracking-tight">"{cl.description}"</p>
                                        </div>
                                        <div className="flex flex-wrap gap-4 mb-10">
                                            <div className="flex items-center gap-3 bg-slate-50/80 px-6 py-3 rounded-2xl text-[11px] text-slate-500 font-semibold lowercase"><MapPin size={16} className="text-rose-400" /> {cl.location || 'campus'}</div>
                                            <div className="flex items-center gap-3 bg-slate-50/80 px-6 py-3 rounded-2xl text-[11px] text-slate-500 font-semibold lowercase"><Clock size={16} className="text-rose-400" /> {new Date(cl.created_at).toLocaleTimeString()}</div>
                                            <div className="flex items-center gap-3 bg-slate-50/80 px-6 py-3 rounded-2xl text-[11px] text-slate-500 font-semibold lowercase"><User size={16} className="text-rose-400" /> {cl.is_anonymous ? 'anon' : (cl.student_id?.name || 'stu')}</div>
                                        </div>
                                        <button onClick={() => handle(cl.complaint_id, 'resolve')} className="group/btn relative overflow-hidden bg-slate-950 text-white w-full py-6 rounded-[2rem] text-[13px] lowercase font-semibold tracking-widest transition-all hover:shadow-2xl hover:shadow-indigo-200">
                                            <span className="relative z-10">archive incident protocol</span>
                                            <div className="absolute inset-0 bg-gradient-to-r from-rose-600 to-indigo-600 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500 opacity-20"></div>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {complaints.filter(cl => cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected').length === 0 && <div className="col-span-2 py-60 text-center text-xs text-slate-300 lowercase tracking-[0.5em] font-black opacity-20 bg-slate-50/50 rounded-[4rem]">No_Triggers_In_Buffer</div>}
                        </div>
                    )}

                    {(activePanel === 'tickets' || activePanel === 'history' || activePanel === 'users') && (
                        <div className="bg-white border border-slate-100 rounded-[3rem] shadow-[0_4px_40px_rgba(0,0,0,0.02)] overflow-hidden">
                            <div className="px-12 py-10 border-b border-slate-50 flex items-center justify-between">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Active Database Index</h3>
                                <div className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">Page 01 / 01</div>
                            </div>
                            <table className="w-full text-left">
                                <thead className="text-[11px] text-slate-400 lowercase tracking-[0.2em] border-b border-slate-50 bg-slate-50/30">
                                    <tr>
                                        {activePanel === 'users' ? (<><th className="px-12 py-8">identity</th><th className="px-12 py-8">dept</th><th className="px-12 py-8 text-right font-black">status</th></>) : 
                                         activePanel === 'history' ? (<><th className="px-12 py-8">id</th><th className="px-12 py-8">result</th><th className="px-12 py-8 text-right font-black">archive_ts</th></>) :
                                         (<><th className="px-12 py-8">id</th><th className="px-12 py-8">status</th><th className="px-12 py-8">dept</th><th className="px-12 py-8 text-right font-black">action_req</th></>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50/50">
                                    {activePanel === 'tickets' ? complaints.filter(cl => !cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected').map(cl => (
                                        <tr key={cl.complaint_id} className="text-sm text-slate-600 font-light lowercase hover:bg-slate-50 transition-all group duration-300">
                                            <td className="px-12 py-7 font-bold text-slate-900 tracking-tighter">{cl.complaint_id}</td>
                                            <td className="px-12 py-7">
                                                <span className="px-4 py-1.5 rounded-xl border border-slate-100 bg-slate-50/50 text-[10px] font-black text-slate-400 capitalize">{cl.status.replace('_',' ')}</span>
                                            </td>
                                            <td className="px-12 py-7 font-semibold text-slate-500">{cl.category}</td>
                                            <td className="px-12 py-7 text-right space-x-8">
                                                <button onClick={() => handle(cl.complaint_id, 'resolve')} className="text-emerald-500 hover:text-emerald-700 font-black transition-colors uppercase text-[10px] tracking-widest">Approve</button>
                                                <button onClick={() => handle(cl.complaint_id, 'reject')} className="text-rose-400 hover:text-rose-600 font-black transition-colors uppercase text-[10px] tracking-widest">Reject</button>
                                            </td>
                                        </tr>
                                    )) : activePanel === 'history' ? complaints.filter(cl => cl.status === 'resolved' || cl.status === 'rejected').map(cl => (
                                        <tr key={cl.complaint_id} className="text-sm text-slate-500 font-light lowercase hover:bg-slate-50 transition-all duration-300">
                                            <td className="px-12 py-6 font-bold text-slate-700">{cl.complaint_id}</td>
                                            <td className="px-12 py-6">
                                                <span className={`px-4 py-1.5 rounded-xl font-black text-[10px] uppercase ${cl.status === 'resolved' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>{cl.status}</span>
                                            </td>
                                            <td className="px-12 py-6 text-right text-slate-300 font-mono text-[10px]">{new Date(cl.updated_at).toLocaleDateString()}</td>
                                        </tr>
                                    )) : users.map(u => (
                                        <tr key={u._id} className="text-sm text-slate-600 font-light lowercase hover:bg-slate-50 transition-all duration-300">
                                            <td className="px-12 py-6 text-slate-900 font-black tracking-tight flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">{u.name?.substring(0,1) || "U"}</div>
                                                {u.name || "unidentified_sys_user"}
                                            </td>
                                            <td className="px-12 py-6 text-slate-500 font-semibold">{u.department || 'general'}</td>
                                            <td className="px-12 py-6 text-right font-black text-[10px] uppercase">
                                                {u.verified ? <span className="text-emerald-500 tracking-widest">Verified_Ok</span> : <span className="text-slate-300">Pending_Auth</span>}
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
