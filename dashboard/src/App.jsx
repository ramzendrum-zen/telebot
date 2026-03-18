/* VERSION 7.1.0 - MSAJCE TERMINAL DASHBOARD - READABILITY OPTIMIZED */
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
    Activity, Home, Settings, Cpu, Inbox, Shield, History, 
    UserCircle, Users, Bell, AlertCircle, Clock, Terminal, 
    BarChart3, MapPin, User, ChevronRight, AlertOctagon, Zap,
    MoreHorizontal, CheckCircle, XCircle
} from 'lucide-react';

const StatCard = ({ label, value, icon: Icon, color = "blue", unit = "" }) => {
    const iconColors = {
        blue: 'text-blue-600',
        red: 'text-rose-600',
        green: 'text-emerald-600',
        amber: 'text-amber-500'
    };
    return (
        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1 flex-1 transition-all hover:bg-slate-50/50">
            <div className="flex items-center justify-between mb-4">
               <div className={`${iconColors[color] || 'text-slate-500'}`}>
                   {Icon ? <Icon size={20} strokeWidth={2} /> : <Activity size={20} strokeWidth={2} />}
               </div>
               <div className="text-[10px] text-slate-300 font-medium tracking-[0.2em] uppercase">terminal telemetry</div>
            </div>
            <div className="text-3xl text-slate-900 tracking-tighter font-normal leading-none">
                {value ?? 0}<span className="text-sm ml-1 text-slate-400">{unit}</span>
            </div>
            <span className="text-[12px] text-slate-500 font-normal lowercase mt-2 tracking-tight">{label}</span>
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
            setLastSync(new Date().toLocaleTimeString([], { hour12:false, hour:'2-digit', minute:'2-digit' }));
            setLoading(false);
        } catch (e) { setLoading(false); }
    };

    useEffect(() => {
        pull();
        const i = setInterval(pull, 12000);
        return () => clearInterval(i);
    }, []);

    const nav = useMemo(() => {
        const common = [
            { id: 'overview', label: 'overview scoreboard', icon: Home },
            { id: 'analytics', label: 'system analytics', icon: Activity },
            { id: 'settings', label: 'admin settings', icon: Settings },
        ];
        if (activeBot === 'assistant') {
            return [ common[0], { id: 'assistant', label: 'academic assistant', icon: Cpu }, common[1], common[2] ];
        }
        return [ 
            common[0], 
            { id: 'tickets', label: 'operational tickets', icon: Inbox }, 
            { id: 'grievance', label: 'grievance portal', icon: Shield, badge: (complaints || []).filter(cl => cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected').length }, 
            { id: 'users', label: 'user database', icon: UserCircle }, 
            { id: 'history', label: 'complaints history', icon: History },
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

    if (loading && !stats) return <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center text-sm font-light lowercase text-slate-400">synchronizing system kernel...</div>;

    return (
        <div className="flex h-screen bg-[#fafbfc] text-slate-800 font-['Inter',sans-serif] selection:bg-slate-100 antialiased overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-100 flex flex-col shrink-0">
                <div className="p-10 pb-12 flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center font-normal text-lg rounded-2xl shadow-xl shadow-slate-200">m</div>
                    <span className="text-[13px] tracking-[0.25em] text-slate-700 font-medium uppercase">msajce</span>
                </div>
                
                <nav className="flex-1 px-5 space-y-1.5 overflow-y-auto custom-scrollbar">
                    {nav.map(item => (
                        <button key={item.id} onClick={() => setActivePanel(item.id)} className={`w-full flex items-center justify-between px-6 py-3.5 rounded-2xl transition-all duration-300 group ${activePanel === item.id ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                            <div className="flex items-center gap-5">
                                <span className={`w-5 shrink-0 flex justify-center ${activePanel === item.id ? "text-blue-600" : "text-slate-300 group-hover:text-slate-400"}`}>
                                    {item.icon && <item.icon size={18} strokeWidth={2} />}
                                </span>
                                <span className="text-[13px] font-normal lowercase tracking-tight">{item.label}</span>
                            </div>
                            {item.badge > 0 && <span className="bg-rose-100 text-rose-500 text-[10px] px-2.5 py-0.5 rounded-full font-medium">{item.badge}</span>}
                        </button>
                    ))}
                </nav>

                <div className="p-10 bg-slate-50/30">
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium lowercase tracking-wide">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse"></div>
                        secure link established
                    </div>
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-24 bg-white border-b border-slate-50 flex items-center justify-between px-12 shrink-0">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-base text-slate-900 font-normal lowercase tracking-[0.15em]">{activeBot} // {activePanel}</h2>
                        <div className="text-[11px] text-slate-300 lowercase tracking-tight">access level 4.0 / sync {lastSync} / online</div>
                    </div>

                    <div className="flex bg-slate-50 p-1.5 rounded-2xl gap-1 border border-slate-100 shadow-inner">
                        <button onClick={() => setActiveBot('assistant')} className={`px-8 py-2.5 rounded-xl text-[12px] lowercase font-normal transition-all ${activeBot === 'assistant' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-300 hover:text-slate-500'}`}>academic</button>
                        <button onClick={() => setActiveBot('grievance')} className={`px-8 py-2.5 rounded-xl text-[12px] lowercase font-normal transition-all ${activeBot === 'grievance' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-300 hover:text-slate-500'}`}>grievance</button>
                    </div>

                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 hover:text-slate-800 transition-all cursor-pointer shadow-sm hover:shadow-md">
                        <User size={24} strokeWidth={1.5} />
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-[#fafbfc]">
                    {/* Render Content Based on Panel */}
                    {activePanel === 'overview' && (
                        <div className="space-y-10 animate-in fade-in duration-700">
                            <div className="flex gap-8 w-full">
                                <StatCard label={activeBot === 'grievance' ? 'total users' : 'total queries'} value={activeBot === 'grievance' ? stats?.users?.total : monitorData?.metrics?.assistant?.total_requests} icon={Users} color="blue" />
                                <StatCard label={activeBot === 'grievance' ? 'tickets active' : 'success rate'} value={activeBot === 'grievance' ? stats?.complaints?.total : `${monitorData?.metrics?.assistant?.success_rate || 100}%`} icon={BarChart3} color="green" />
                                <StatCard label={activeBot === 'grievance' ? 'emergency alerts' : 'system errors'} value={activeBot === 'grievance' ? stats?.complaints?.emergency : monitorData?.metrics?.assistant?.total_errors} icon={AlertCircle} color="red" />
                                <StatCard label="avg resolution" value={activeBot === 'grievance' ? stats?.complaints?.avg_resolution : (monitorData?.metrics?.assistant?.avg_latency || 0).toFixed(0)} unit={activeBot === 'grievance' ? 'h' : 'ms'} icon={Clock} color="amber" />
                            </div>

                            <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                <h3 className="text-[12px] text-slate-500 font-medium lowercase mb-8 flex items-center gap-3 tracking-[0.05em]">
                                    <Terminal size={16} strokeWidth={1.5} className="text-slate-400" /> realtime system telemetry feed
                                </h3>
                                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-6 custom-scrollbar">
                                    {(monitorData.logs || []).slice(0, 50).map((log, ix) => (
                                        <div key={ix} className="flex gap-10 text-[13px] items-center p-4 hover:bg-slate-50 rounded-2xl transition-all group">
                                            <span className="text-slate-300 font-light w-20 shrink-0">{new Date(log.timestamp || Date.now()).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' })}</span>
                                            <div className={`px-2.5 py-0.5 rounded-lg text-[10px] lowercase font-medium border border-transparent group-hover:border-slate-100 ${log.bot === 'assistant' ? 'bg-blue-50 text-blue-500' : 'bg-slate-50 text-slate-400'}`}>{log.bot}</div>
                                            <span className="text-slate-700 font-normal truncate tracking-tight">{log.message}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activePanel === 'grievance' && (
                        <div className="space-y-8 max-w-5xl mx-auto">
                            {complaints.filter(cl => cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected').map(cl => (
                                <div key={cl.complaint_id} className="border border-slate-100 rounded-[2.5rem] p-10 bg-white shadow-sm hover:shadow-xl transition-all duration-500">
                                    <div className="flex justify-between items-start mb-8">
                                        <h4 className="text-sm text-rose-500 font-normal lowercase tracking-wide flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span> {cl.category}
                                        </h4>
                                        <span className="text-[11px] text-slate-200 lowercase font-mono">{cl.complaint_id}</span>
                                    </div>
                                    <p className="text-lg font-light text-slate-800 mb-10 leading-relaxed pl-10 border-l-[3px] border-slate-50">{cl.description}</p>
                                    <div className="grid grid-cols-3 gap-8 text-[12px] text-slate-400 mb-10 font-light lowercase">
                                        <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl"><MapPin size={18} strokeWidth={1.5} className="text-slate-300"/> <span>{cl.location || 'campus'}</span></div>
                                        <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl"><Clock size={18} strokeWidth={1.5} className="text-slate-300"/> <span>{new Date(cl.created_at).toLocaleTimeString()}</span></div>
                                        <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl"><User size={18} strokeWidth={1.5} className="text-slate-300"/> <span>{cl.is_anonymous ? 'anon' : (cl.student_id?.name || 'stu')}</span></div>
                                    </div>
                                    <button onClick={() => handle(cl.complaint_id, 'resolve')} className="w-full bg-slate-900 text-white py-5 rounded-2xl text-[13px] lowercase font-light hover:bg-black transition-all shadow-xl active:scale-[0.98]">resolve emergency incident</button>
                                </div>
                            ))}
                            {complaints.filter(cl => cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected').length === 0 && <div className="py-40 text-center text-sm text-slate-300 lowercase tracking-[0.3em]">no active emergency data detected</div>}
                        </div>
                    )}

                    {(activePanel === 'tickets' || activePanel === 'history' || activePanel === 'users') && (
                        <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden p-2">
                            <table className="w-full text-left">
                                <thead className="text-[11px] text-slate-400 lowercase tracking-widest border-b border-slate-50 bg-slate-50/20">
                                    <tr>
                                        {activePanel === 'users' ? (<><th className="px-12 py-8">identity</th><th className="px-12 py-8">dept</th><th className="px-12 py-8 text-right">status</th></>) : 
                                         activePanel === 'history' ? (<><th className="px-12 py-8">id</th><th className="px-12 py-8">status</th><th className="px-12 py-8 text-right">archived</th></>) :
                                         (<><th className="px-12 py-8">id</th><th className="px-12 py-8">status</th><th className="px-12 py-8">dept</th><th className="px-12 py-8 text-right">actions</th></>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50/50">
                                    {activePanel === 'tickets' ? complaints.filter(cl => !cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected').map(cl => (
                                        <tr key={cl.complaint_id} className="text-sm text-slate-600 font-light lowercase hover:bg-slate-50/50 transition-colors">
                                            <td className="px-12 py-6 font-medium text-slate-800">{cl.complaint_id}</td>
                                            <td className="px-12 py-6"><span className="text-[11px] text-slate-400">{cl.status.replace('_',' ')}</span></td>
                                            <td className="px-12 py-6 font-medium text-slate-500">{cl.category}</td>
                                            <td className="px-12 py-6 text-right space-x-8">
                                                <button onClick={() => handle(cl.complaint_id, 'resolve')} className="text-emerald-500 hover:text-emerald-700 font-medium transition-colors">approve</button>
                                                <button onClick={() => handle(cl.complaint_id, 'reject')} className="text-rose-400 hover:text-rose-600 font-medium transition-colors">reject</button>
                                            </td>
                                        </tr>
                                    )) : activePanel === 'history' ? complaints.filter(cl => cl.status === 'resolved' || cl.status === 'rejected').map(cl => (
                                        <tr key={cl.complaint_id} className="text-sm text-slate-500 font-light lowercase hover:bg-slate-50/50 transition-colors">
                                            <td className="px-12 py-6">{cl.complaint_id}</td>
                                            <td className={`px-12 py-6 ${cl.status === 'resolved' ? 'text-emerald-500' : 'text-rose-400'}`}>{cl.status}</td>
                                            <td className="px-12 py-6 text-right text-slate-300 font-light tracking-tighter">{new Date(cl.updated_at).toLocaleDateString()}</td>
                                        </tr>
                                    )) : users.map(u => (
                                        <tr key={u._id} className="text-sm text-slate-600 font-light lowercase hover:bg-slate-50/50 transition-colors">
                                            <td className="px-12 py-6 text-slate-800 font-medium">{u.name || "sys user"}</td>
                                            <td className="px-12 py-6">{u.department || 'general'}</td>
                                            <td className="px-12 py-6 text-right font-medium">{u.verified ? <span className="text-emerald-500">verified</span> : <span className="text-slate-300">pending</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activePanel === 'analytics' && (
                        <div className="py-60 text-center text-sm text-slate-200 font-light lowercase tracking-[0.4em] animate-pulse">
                            mapping system analytic streams ...
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;
