/* VERSION 10.0.0 - MSAJCE TERMINAL - PROFESSIONAL STANDARD */
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
                <span className="text-[12px] text-slate-500 font-semibold uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-2xl text-slate-900 font-bold tracking-tighter">
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
            { id: 'overview', label: 'Dashboard Overview', icon: Home },
            { id: 'analytics', label: 'System Analytics', icon: Activity },
            { id: 'settings', label: 'Admin Settings', icon: Settings },
        ];
        if (activeBot === 'assistant') {
            return [ common[0], { id: 'assistant', label: 'Academic Assistant', icon: Cpu }, common[1], common[2] ];
        }
        return [ 
            common[0], 
            { id: 'tickets', label: 'Active Tickets', icon: Inbox }, 
            { id: 'grievance', label: 'Emergency Alerts', icon: Shield, badge: (complaints || []).filter(cl => cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected').length }, 
            { id: 'users', label: 'User Database', icon: UserCircle }, 
            { id: 'history', label: 'Archive History', icon: History },
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

    if (loading && !stats) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-400 font-bold uppercase tracking-[0.2em]">Synchronising MSAJCE Kernel...</div>;

    const ticketsData = complaints.filter(cl => !cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected');
    const emergencyData = complaints.filter(cl => cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected');
    const historyData = complaints.filter(cl => cl.status === 'resolved' || cl.status === 'rejected');

    return (
        <div className="flex h-screen bg-[#fafbfc] text-slate-800 font-['Inter',sans-serif] selection:bg-indigo-100 antialiased overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-100 flex flex-col shrink-0 z-50">
                <div className="p-8 pb-10 flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 text-white flex items-center justify-center font-bold text-sm rounded-xl shadow-lg shadow-indigo-100">M</div>
                    <span className="text-[14px] tracking-widest text-slate-900 font-black uppercase">MSAJCE</span>
                </div>
                
                <nav className="flex-1 px-3 space-y-1">
                    {nav.map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => setActivePanel(item.id)} 
                            className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all duration-200 group ${
                                activePanel === item.id 
                                ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-50/50' 
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <span className={`w-4 shrink-0 flex justify-center ${activePanel === item.id ? "text-indigo-600" : "text-slate-300"}`}>
                                    {item.icon && <item.icon size={16} strokeWidth={2} />}
                                </span>
                                <span className="text-[13px] font-semibold tracking-tight">{item.label}</span>
                            </div>
                            {item.badge > 0 && <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-md shadow-rose-200">{item.badge}</span>}
                        </button>
                    ))}
                </nav>

                <div className="p-8">
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold uppercase mb-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                            System Online
                        </div>
                        <div className="text-[9px] text-slate-400 font-bold tracking-tight uppercase">Build 10.0.0 / {lastSync}</div>
                    </div>
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-500 font-bold uppercase tracking-wide">{activeBot} // {activePanel}</span>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="flex bg-slate-50 p-1.5 rounded-xl gap-1 border border-slate-200">
                            <button onClick={() => setActiveBot('assistant')} className={`px-8 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${activeBot === 'assistant' ? 'bg-white text-slate-900 shadow-xl border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>Academic Bot</button>
                            <button onClick={() => setActiveBot('grievance')} className={`px-8 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${activeBot === 'grievance' ? 'bg-white text-slate-900 shadow-xl border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>Grievance Bot</button>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-300 cursor-pointer hover:bg-slate-50 transition-all shadow-sm">
                            <User size={20} strokeWidth={1.5} />
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-[#fafbfc]">
                    {/* Content */}
                    {activePanel === 'overview' && (
                        <div className="space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-700">
                            <div className="flex gap-8">
                                <MetricCard label={activeBot === 'grievance' ? 'Total Registrations' : 'Requests Processed'} value={activeBot === 'grievance' ? stats?.users?.total : monitorData?.metrics?.assistant?.total_requests} icon={Users} color="indigo" />
                                <MetricCard label={activeBot === 'grievance' ? 'Pending Complaints' : 'System Availability'} value={activeBot === 'grievance' ? stats?.complaints?.total : `${monitorData?.metrics?.assistant?.success_rate || 100}%`} icon={BarChart3} color="emerald" />
                                <MetricCard label={activeBot === 'grievance' ? 'Emergency Triggers' : 'Runtime Exceptions'} value={activeBot === 'grievance' ? stats?.complaints?.emergency : monitorData?.metrics?.assistant?.total_errors} icon={AlertCircle} color="rose" />
                                <MetricCard label="Resolution Speed" value={activeBot === 'grievance' ? stats?.complaints?.avg_resolution : (monitorData?.metrics?.assistant?.avg_latency || 0).toFixed(0)} unit={activeBot === 'grievance' ? 'h' : 'ms'} icon={Clock} color="amber" />
                            </div>

                            <div className="bg-white border border-slate-100 rounded-[2rem] shadow-[0_4px_30px_rgba(0,0,0,0.02)] overflow-hidden">
                                <div className="px-12 py-8 border-b border-slate-50 bg-slate-50/20 flex items-center justify-between">
                                    <h3 className="text-[13px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-3">
                                        <TerminalIcon size={18} strokeWidth={2} className="text-indigo-500" /> Live System Telemetry
                                    </h3>
                                    <div className="text-[10px] text-indigo-500 font-bold uppercase px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full">Stream Active</div>
                                </div>
                                <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto custom-scrollbar">
                                    {(monitorData.logs || []).slice(0, 50).map((log, ix) => (
                                        <div key={ix} className="flex gap-12 text-[14px] items-center px-12 py-6 hover:bg-slate-50 transition-colors">
                                            <span className="text-slate-300 w-20 shrink-0 font-bold font-mono text-xs">{new Date(log.timestamp || Date.now()).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
                                            <span className={`text-[10px] uppercase font-black px-3 py-1 rounded-lg border ${log.bot === 'assistant' ? 'border-indigo-100 bg-indigo-50 text-indigo-600' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>{log.bot}</span>
                                            <span className="text-slate-700 font-medium truncate tracking-tight">{log.message}</span>
                                        </div>
                                    ))}
                                    {(monitorData.logs || []).length === 0 && <div className="py-20 text-center text-xs text-slate-300 uppercase tracking-widest font-black">No telemetry data detected</div>}
                                </div>
                            </div>
                        </div>
                    )}

                    {activePanel === 'grievance' && (
                        <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">
                            {emergencyData.map(cl => (
                                <div key={cl.complaint_id || cl._id} className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-10 shadow-sm hover:shadow-xl transition-all duration-300">
                                    <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-6">
                                        <span className="text-sm text-rose-600 font-black uppercase tracking-widest flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span> {cl.category}
                                        </span>
                                        <span className="text-[12px] text-slate-400 font-black font-mono">ID: {cl.complaint_id || (cl._id?.substring(0,8))}</span>
                                    </div>
                                    <p className="text-xl font-light text-slate-800 mb-10 leading-relaxed border-l-4 border-rose-50 pl-10">"{cl.description}"</p>
                                    <div className="grid grid-cols-3 gap-8 text-xs text-slate-500 mb-10 font-bold uppercase tracking-tight">
                                        <div className="flex items-center gap-4 bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100"><MapPin size={20} className="text-rose-400"/> <span>{cl.location || 'CAMPUS'}</span></div>
                                        <div className="flex items-center gap-4 bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100"><Clock size={20} className="text-rose-400"/> <span>{new Date(cl.created_at).toLocaleTimeString()}</span></div>
                                        <div className="flex items-center gap-4 bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100"><UserCircle size={20} className="text-rose-400"/> <span>{cl.is_anonymous ? 'ANONYMOUS' : (cl.student_id?.name || 'USER')}</span></div>
                                    </div>
                                    <button onClick={() => handle(cl.complaint_id, 'resolve')} className="w-full bg-slate-950 text-white py-5 rounded-[2rem] text-[15px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-2xl shadow-indigo-100 active:scale-[0.98]">Resolve Incident Archive</button>
                                </div>
                            ))}
                            {emergencyData.length === 0 && <div className="py-40 text-center text-sm text-slate-200 uppercase tracking-[0.4em] font-black italic">No emergency protocols triggered</div>}
                        </div>
                    )}

                    {(activePanel === 'tickets' || activePanel === 'history' || activePanel === 'users') && (
                        <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-[0_4px_40px_rgba(0,0,0,0.025)] overflow-hidden max-w-[1600px] mx-auto animate-in fade-in duration-500">
                            <table className="w-full text-left">
                                <thead className="text-[11px] text-slate-400 uppercase tracking-[0.2em] border-b border-slate-200 bg-slate-50/40">
                                    <tr>
                                        {activePanel === 'users' ? (<><th className="px-12 py-10 font-black">User Identity</th><th className="px-12 py-10 font-black">Department</th><th className="px-12 py-10 text-right font-black">Verification</th></>) : 
                                         activePanel === 'history' ? (<><th className="px-12 py-10 font-black">Ticket ID</th><th className="px-12 py-10 font-black">Status Result</th><th className="px-12 py-10 text-right font-black">Final Timestamp</th></>) :
                                         (<><th className="px-12 py-10 font-black">Ticket ID</th><th className="px-12 py-10 font-black">Status</th><th className="px-12 py-10 font-black">Category</th><th className="px-12 py-10 text-right font-black">Management</th></>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {activePanel === 'tickets' ? ticketsData.map(cl => (
                                        <tr key={cl.complaint_id || cl._id} className="hover:bg-slate-50/50 transition-all duration-300">
                                             <td className="px-12 py-7 text-slate-900 font-black tracking-tight text-base font-mono">#{cl.complaint_id || (cl._id?.substring(0,8))}</td>
                                             <td className="px-12 py-7"><span className="px-5 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-[10px] font-black uppercase text-slate-400">{cl.status.replace('_',' ')}</span></td>
                                             <td className="px-12 py-7 font-bold text-slate-500 uppercase text-xs">{cl.category}</td>
                                             <td className="px-12 py-7 text-right space-x-10">
                                                 <button onClick={() => handle(cl.complaint_id, 'resolve')} className="text-emerald-600 hover:text-emerald-800 font-black uppercase text-xs tracking-widest border-b-2 border-emerald-50 hover:border-emerald-600 transition-all">APPROVE</button>
                                                 <button onClick={() => handle(cl.complaint_id, 'reject')} className="text-rose-500 hover:text-rose-700 font-black uppercase text-xs tracking-widest border-b-2 border-rose-50 hover:border-rose-500 transition-all">REJECT</button>
                                             </td>
                                        </tr>
                                    )) : activePanel === 'history' ? historyData.map(cl => (
                                        <tr key={cl.complaint_id || cl._id} className="hover:bg-slate-50/50 transition-all duration-300">
                                            <td className="px-12 py-6 font-black text-slate-800 font-mono text-base">#{cl.complaint_id || (cl._id?.substring(0,8))}</td>
                                            <td className="px-12 py-6">
                                                <span className={`px-5 py-1.5 rounded-full font-black text-[10px] uppercase shadow-sm ${cl.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{cl.status}</span>
                                            </td>
                                            <td className="px-12 py-6 text-right text-slate-400 font-black uppercase text-[10px] tracking-widest">{new Date(cl.updated_at).toLocaleDateString()}</td>
                                        </tr>
                                    )) : users.map(u => (
                                        <tr key={u._id} className="hover:bg-slate-50/50 transition-all duration-300">
                                            <td className="px-12 py-6 text-slate-900 font-black tracking-tight text-base flex items-center gap-5">
                                                <div className="w-10 h-10 rounded-[1rem] bg-indigo-50 text-indigo-500 flex items-center justify-center font-black">{u.name?.substring(0,1) || "U"}</div>
                                                {u.name || "UNIDENTIFIED USER"}
                                            </td>
                                            <td className="px-12 py-6 font-black text-slate-400 uppercase text-xs">{u.department || 'GENERAL'}</td>
                                            <td className="px-12 py-6 text-right font-black text-[11px] uppercase tracking-widest">
                                                {u.verified ? <span className="text-emerald-500">VERIFIED OK</span> : <span className="text-slate-200">PENDING AUTH</span>}
                                            </td>
                                        </tr>
                                    ))}
                                    {((activePanel === 'tickets' && ticketsData.length === 0) || (activePanel === 'history' && historyData.length === 0) || (activePanel === 'users' && users.length === 0)) && (
                                        <tr><td colSpan="4" className="py-40 text-center text-xs text-slate-300 uppercase tracking-[0.3em] font-black italic">No relevant data index found in archive</td></tr>
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
