/* VERSION 13.0.0 - MSAJCE TERMINAL - GRID ALIGNED KERNEL */
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

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-10 text-center">
            <AlertOctagon size={48} className="text-rose-500 mb-4" />
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-widest mb-2">Kernel Panic</h1>
            <p className="text-sm text-slate-400 font-medium lowercase">System alignment failure. Re-indexing telemetry...</p>
            <button onClick={() => window.location.reload()} className="mt-8 px-8 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-xl">Restart Interface</button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
                <span className="text-[12px] text-slate-500 font-black uppercase tracking-widest">{label}</span>
            </div>
            <div className="text-2xl text-slate-800 font-black tracking-tighter">
                {value ?? 0}<span className="text-sm ml-1 text-slate-300 font-normal">{unit}</span>
            </div>
        </div>
    );
};

const Dashboard = () => {
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
            setLastSync(new Date().toLocaleTimeString([], { hour:'2-digit', minute:'1-digit', second:'2-digit' }));
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

    if (loading && !stats) return (
        <div className="min-h-screen bg-[#fafbfc] flex flex-col items-center justify-center gap-6">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl animate-pulse"></div>
            <div className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em]">system_handshake_in_progress</div>
        </div>
    );

    const botLogs = (monitorData.logs || []).filter(l => l.bot === activeBot);
    const activeTickets = complaints.filter(cl => !cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected');
    const emergencyList = complaints.filter(cl => cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected');
    const pastHistory = complaints.filter(cl => cl.status === 'resolved' || cl.status === 'rejected');

    return (
        <div className="flex h-screen bg-[#fafbfc] text-slate-800 font-['Inter',sans-serif] selection:bg-indigo-100 antialiased overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-100 flex flex-col shrink-0 z-50">
                <div className="p-8 pb-10 flex items-center gap-4">
                    <div className="w-9 h-9 bg-slate-950 text-white flex items-center justify-center font-black text-sm rounded-2xl shadow-xl">M</div>
                    <span className="text-[15px] tracking-widest text-slate-900 font-black uppercase tracking-tighter">msajce</span>
                </div>
                
                <nav className="flex-1 px-4 space-y-1.5">
                    {nav.map(item => (
                        <button key={item.id} onClick={() => setActivePanel(item.id)} className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-300 group ${activePanel === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50'}`}>
                            <div className="flex items-center gap-5">
                                <span className={`w-4 flex justify-center ${activePanel === item.id ? "text-white" : "text-slate-300 group-hover:text-indigo-400"}`}>
                                    {item.icon && <item.icon size={17} strokeWidth={2.5} />}
                                </span>
                                <span className={`text-[13px] font-bold ${activePanel === item.id ? "text-white" : "text-slate-600"}`}>{item.label}</span>
                            </div>
                            {item.badge > 0 && <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black ${activePanel === item.id ? "bg-white text-indigo-600" : "bg-rose-500 text-white shadow-lg shadow-rose-200"}`}>{item.badge}</span>}
                        </button>
                    ))}
                </nav>

                <div className="p-8">
                    <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100">
                        <div className="flex items-center gap-2.5 text-[10px] text-slate-500 font-black uppercase mb-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
                            kernel_active
                        </div>
                        <div className="text-[9px] text-slate-400 font-black tracking-widest uppercase">node_v13.0 / {lastSync}</div>
                    </div>
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-12 shrink-0">
                    <div className="flex items-center gap-4 text-[13px] text-slate-400 font-black uppercase tracking-widest">
                        {activeBot} cluster // {activePanel} index
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1.5 border border-slate-200">
                            <button onClick={() => setActiveBot('assistant')} className={`px-10 py-2.5 rounded-xl text-xs font-black uppercase transition-all duration-300 ${activeBot === 'assistant' ? 'bg-white text-slate-900 shadow-2xl border border-slate-200 scale-105' : 'text-slate-400 hover:text-slate-600'}`}>Assistant</button>
                            <button onClick={() => setActiveBot('grievance')} className={`px-10 py-2.5 rounded-xl text-xs font-black uppercase transition-all duration-300 ${activeBot === 'grievance' ? 'bg-white text-slate-900 shadow-2xl border border-slate-200 scale-105' : 'text-slate-400 hover:text-slate-600'}`}>Grievance</button>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 cursor-pointer shadow-lg hover:border-indigo-200 transition-all">
                            <User size={22} strokeWidth={2} />
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-[#fafbfc]">
                    {activePanel === 'overview' && (
                        <div className="space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-500">
                            <div className="flex gap-8">
                                <MetricCard label={activeBot === 'grievance' ? 'total users' : 'requests handled'} value={activeBot === 'grievance' ? stats?.users?.total : monitorData?.metrics?.assistant?.total_requests} icon={Users} color="indigo" />
                                <MetricCard label={activeBot === 'grievance' ? 'pending tasks' : 'success throughput'} value={activeBot === 'grievance' ? stats?.complaints?.total : `${monitorData?.metrics?.assistant?.success_rate || 100}%`} icon={BarChart3} color="emerald" />
                                <MetricCard label={activeBot === 'grievance' ? 'emergency alerts' : 'kernel errors'} value={activeBot === 'grievance' ? stats?.complaints?.emergency : monitorData?.metrics?.assistant?.total_errors} icon={AlertCircle} color="rose" />
                                <MetricCard label="avg runtime" value={activeBot === 'grievance' ? stats?.complaints?.avg_resolution : (monitorData?.metrics?.assistant?.avg_latency || 0).toFixed(0)} unit={activeBot === 'grievance' ? 'h' : 'ms'} icon={Clock} color="amber" />
                            </div>

                            <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden border-2">
                                <div className="px-12 py-8 border-b border-slate-50 bg-slate-50/20">
                                    <h3 className="text-[11px] text-slate-500 font-black uppercase tracking-[0.3em] flex items-center gap-4">
                                        <TerminalIcon size={18} strokeWidth={3} className="text-indigo-600" /> system_activity_feed_realtime
                                    </h3>
                                </div>
                                <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto custom-scrollbar">
                                    {botLogs.slice(0, 50).map((log, ix) => (
                                        <div key={ix} className="flex gap-12 text-[14px] items-center px-12 py-6 hover:bg-slate-50 transition-all group">
                                            <span className="text-slate-300 w-24 shrink-0 font-black font-mono text-xs text-right whitespace-nowrap">{new Date(log.timestamp || Date.now()).toLocaleTimeString([], { hour:'2-digit', minute:'1-digit', second:'2-digit' })}</span>
                                            <span className={`text-[10px] uppercase font-black px-4 py-1 rounded-lg border flex-none ${log.level === 'error' ? 'border-rose-100 bg-rose-50 text-rose-500 shadow-sm' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>{log.level || 'info'}</span>
                                            <span className="text-slate-700 font-bold truncate tracking-tight flex-1">{log.message}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activePanel === 'analytics' && (
                        <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden max-w-[1600px] mx-auto animate-in fade-in duration-500">
                            <table className="w-full text-left table-fixed">
                                <thead className="text-[11px] text-slate-400 uppercase tracking-widest border-b-2 border-slate-100 bg-slate-50/30">
                                    <tr>
                                        <th className="px-12 py-10 font-black w-[25%] whitespace-nowrap">Timestamp index</th>
                                        <th className="px-12 py-10 font-black w-[15%] whitespace-nowrap">Log level</th>
                                        <th className="px-12 py-10 font-black w-[40%] whitespace-nowrap">Telemetry payload</th>
                                        <th className="px-12 py-10 text-right font-black w-[20%] whitespace-nowrap">Terminal node</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {botLogs.map((log, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-all font-bold text-slate-600 text-[14px] items-center">
                                            <td className="px-12 py-8 text-slate-400 font-mono flex items-center gap-4 whitespace-nowrap h-full">
                                                <Calendar size={14} className="text-indigo-200" /> {new Date(log.timestamp).toLocaleDateString()}
                                                <Watch size={14} className="text-indigo-200" /> {new Date(log.timestamp).toLocaleTimeString([], { hour12:false })}
                                            </td>
                                            <td className="px-12 py-8 whitespace-nowrap">
                                                <span className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase ${log.level === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100 shadow-xl shadow-rose-50' : 'bg-slate-50 text-slate-400'}`}>{log.level || 'info'}</span>
                                            </td>
                                            <td className={`px-12 py-8 tracking-tight truncate ${log.level === 'error' ? 'text-rose-700' : 'text-slate-700'}`}>{log.message}</td>
                                            <td className="px-12 py-8 text-right text-slate-200 font-black font-mono whitespace-nowrap italic tracking-widest">_NODE_{i}</td>
                                        </tr>
                                    ))}
                                    {botLogs.length === 0 && <tr><td colSpan="4" className="py-40 text-center text-xs text-slate-200 font-black uppercase tracking-[0.5em] italic">No archived telemetry packet_found</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activePanel === 'users' && (
                        <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden max-w-[1600px] mx-auto animate-in fade-in duration-500">
                             <table className="w-full text-left table-fixed">
                                <thead className="text-[11px] text-slate-400 uppercase tracking-widest border-b-2 border-slate-100 bg-slate-50/30">
                                    <tr>
                                        <th className="px-12 py-10 font-black w-[30%] whitespace-nowrap">Identity handle</th>
                                        <th className="px-12 py-10 font-black w-[25%] whitespace-nowrap">Comm protocols</th>
                                        <th className="px-12 py-10 font-black w-[25%] whitespace-nowrap">Operational cluster</th>
                                        <th className="px-12 py-10 text-right font-black w-[20%] whitespace-nowrap">Auth status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {users.map(u => (
                                        <tr key={u._id} className="hover:bg-slate-50 transition-all font-bold text-slate-600 text-[14px]">
                                            <td className="px-12 py-8 text-slate-900 flex items-center gap-6 whitespace-nowrap h-full">
                                                <div className="w-12 h-12 rounded-[1.2rem] bg-slate-950 text-white flex items-center justify-center font-black shadow-2xl leading-none">{u.name?.substring(0,1) || "U"}</div>
                                                <span className="tracking-tighter lowercase">{u.name || "unidentified_user"}</span>
                                            </td>
                                            <td className="px-12 py-8 text-slate-400 lowercase whitespace-nowrap overflow-hidden text-ellipsis">
                                                <div className="flex items-center gap-4"><Mail size={14} className="text-slate-200" /> {u.email || '@nil'}</div>
                                            </td>
                                            <td className="px-12 py-8 uppercase font-black text-slate-300 text-[10px] tracking-widest italic">{u.department || 'general_node'}</td>
                                            <td className="px-12 py-8 text-right whitespace-nowrap">
                                                <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${u.verified ? 'bg-emerald-50 text-emerald-500 border-emerald-200 shadow-xl shadow-emerald-50' : 'bg-slate-50 text-slate-200 border-slate-100'}`}>{u.verified ? 'Verified' : 'Pending'}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    )}

                    {(activePanel === 'tickets' || activePanel === 'history' || activePanel === 'grievance') && (
                        <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden max-w-[1600px] mx-auto animate-in fade-in duration-500">
                            <table className="w-full text-left table-fixed">
                                <thead className="text-[11px] text-slate-400 uppercase tracking-widest border-b-2 border-slate-100 bg-slate-50/30">
                                    <tr>
                                        <th className="px-12 py-10 font-black w-[25%] whitespace-nowrap">Grievance_id</th>
                                        <th className="px-12 py-10 font-black w-[20%] whitespace-nowrap">Current state</th>
                                        <th className="px-12 py-10 font-black w-[30%] whitespace-nowrap">Operational dept</th>
                                        <th className="px-12 py-10 text-right font-black w-[25%] whitespace-nowrap">Management suit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {(activePanel === 'tickets' ? activeTickets : activePanel === 'grievance' ? emergencyList : pastHistory).map(cl => (
                                        <tr key={cl._id} className="hover:bg-slate-50/50 transition-all font-bold text-slate-600 text-[15px]">
                                            <td className="px-12 py-8 font-black text-blue-600 font-mono tracking-tighter flex items-center gap-5 whitespace-nowrap h-full uppercase italic">
                                                {(activeBot === 'grievance' || cl.is_emergency) && <ShieldAlert size={18} className="text-rose-500 animate-pulse" />}
                                                {formatId(cl.complaint_id)}
                                            </td>
                                            <td className="px-12 py-8 whitespace-nowrap">
                                                <span className={`px-5 py-2 rounded-2xl text-[11px] font-black uppercase tracking-tighter ${cl.status === 'resolved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-xl shadow-emerald-50' : cl.status === 'rejected' ? 'bg-rose-50 text-rose-500 border border-rose-100 shadow-xl shadow-rose-50' : 'bg-slate-50 text-slate-400'}`}>{cl.status.replace('_',' ')}</span>
                                            </td>
                                            <td className="px-12 py-8 font-bold text-slate-400 lowercase whitespace-nowrap truncate">{cl.category}</td>
                                            <td className="px-12 py-8 text-right space-x-10 whitespace-nowrap">
                                                {(activePanel === 'tickets' || activePanel === 'grievance') ? (
                                                    <><button onClick={() => handle(cl.complaint_id, 'resolve')} className="text-emerald-500 hover:text-indigo-600 font-black uppercase text-[12px] tracking-[0.2em] border-b-4 border-emerald-100 hover:border-indigo-600 transition-all pb-1">Approve</button>
                                                    <button onClick={() => handle(cl.complaint_id, 'reject')} className="text-rose-400 hover:text-rose-600 font-black uppercase text-[12px] tracking-[0.2em] border-b-4 border-rose-100 hover:border-rose-600 transition-all pb-1">Reject</button></>
                                                ) : <span className="text-[11px] text-slate-300 font-black uppercase tracking-[0.3em] font-mono italic">{new Date(cl.updated_at).toLocaleDateString()}</span>}
                                            </td>
                                        </tr>
                                    ))}
                                    {((activePanel === 'tickets' && activeTickets.length === 0) || (activePanel === 'history' && pastHistory.length === 0) || (activePanel === 'grievance' && emergencyList.length === 0)) && (
                                        <tr><td colSpan="4" className="py-44 text-center text-xs text-slate-200 font-black uppercase tracking-[1em] italic">Access_Log_Empty_Record_NotFound</td></tr>
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

const App = () => (
  <ErrorBoundary>
    <Dashboard />
  </ErrorBoundary>
);

export default App;
