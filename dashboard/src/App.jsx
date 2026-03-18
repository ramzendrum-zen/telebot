/* VERSION 13.1.0 - MSAJCE TERMINAL - ULTRA COMPACT RECOVERY */
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
            <AlertOctagon size={40} className="text-rose-500 mb-4" />
            <h1 className="text-lg font-black text-slate-800 uppercase tracking-widest mb-2">Kernel Panic Detected</h1>
            <p className="text-xs text-slate-400 font-medium lowercase">Automated recovery in progress. Terminal handshake failed.</p>
            <button onClick={() => window.location.reload()} className="mt-8 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">Re-establish Kernel Link</button>
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
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-indigo-100 transition-all flex-1 min-w-[200px]">
            <div className="flex items-center gap-2.5 mb-2.5">
                <div className={`${colors[color] || colors.slate}`}>
                    {Icon ? <Icon size={14} strokeWidth={2.5} /> : <Activity size={14} strokeWidth={2.5} />}
                </div>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{label}</span>
            </div>
            <div className="text-xl text-slate-800 font-black tracking-tighter">
                {value ?? 0}<span className="text-xs ml-0.5 text-slate-300 font-bold uppercase">{unit}</span>
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
            setComplaints(Array.isArray(c.data) ? c.data : []);
            setStats(s.data);
            setMonitorData(m.data || {logs:[], metrics:{}});
            setUsers(Array.isArray(u.data) ? u.data : []);
            setLastSync(new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' }));
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
        if (!id) return 'GRV_UNSET';
        const rawId = id.toString().startsWith('grv-') ? id : `grv-${id.toString().substring(id.toString().length - 4)}`;
        return rawId.toUpperCase();
    };

    const handle = async (id, action) => {
        try { await axios.post(`/api/admin/complaints/${id}/action`, { action }); pull(); } catch (e) {}
    };

    if (loading && !stats) return (
        <div className="min-h-screen bg-[#fafbfc] flex flex-col items-center justify-center gap-4">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-[9px] font-black text-slate-300 uppercase tracking-[1em]">handshaking_kernel</div>
        </div>
    );

    const botLogs = (monitorData?.logs || []).filter(l => l && l.bot === activeBot);
    const activeTickets = complaints.filter(cl => cl && !cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected');
    const emergencyList = complaints.filter(cl => cl && cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected');
    const pastHistory = complaints.filter(cl => cl && (cl.status === 'resolved' || cl.status === 'rejected'));

    return (
        <div className="flex h-screen bg-[#fafbfc] text-slate-800 font-['Inter',sans-serif] selection:bg-indigo-100 antialiased overflow-hidden">
            {/* Sidebar */}
            <aside className="w-56 bg-white border-r border-slate-100 flex flex-col shrink-0 z-50">
                <div className="p-6 pb-8 flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-950 text-white flex items-center justify-center font-black text-xs rounded-xl shadow-lg">M</div>
                    <span className="text-[13px] tracking-widest text-slate-900 font-black uppercase">msajce</span>
                </div>
                
                <nav className="flex-1 px-3 space-y-1">
                    {nav.map(item => (
                        <button key={item.id} onClick={() => setActivePanel(item.id)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group ${activePanel === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50'}`}>
                            <div className="flex items-center gap-4">
                                <span className={`w-4 flex justify-center ${activePanel === item.id ? "text-white" : "text-slate-300 group-hover:text-indigo-400"}`}>
                                    {item.icon && <item.icon size={15} strokeWidth={2.5} />}
                                </span>
                                <span className={`text-[12px] font-bold ${activePanel === item.id ? "text-white" : "text-slate-600"}`}>{item.label}</span>
                            </div>
                            {item.badge > 0 && <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${activePanel === item.id ? "bg-white text-indigo-600" : "bg-rose-500 text-white"}`}>{item.badge}</span>}
                        </button>
                    ))}
                </nav>

                <div className="p-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2 text-[8px] text-slate-400 font-black uppercase mb-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            online
                        </div>
                        <div className="text-[8px] text-slate-300 font-black tracking-widest uppercase">v13.1 / {lastSync}</div>
                    </div>
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 shrink-0">
                    <div className="flex items-center gap-4 text-[11px] text-slate-400 font-black uppercase tracking-widest">
                        {activeBot} // {activePanel}
                    </div>

                    <div className="flex items-center gap-5">
                        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200">
                            <button onClick={() => setActiveBot('assistant')} className={`px-6 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeBot === 'assistant' ? 'bg-white text-slate-900 shadow-xl border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>Assistant</button>
                            <button onClick={() => setActiveBot('grievance')} className={`px-6 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeBot === 'grievance' ? 'bg-white text-slate-900 shadow-xl border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>Grievance</button>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 cursor-pointer shadow-sm">
                            <User size={18} />
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#fafbfc]">
                    {activePanel === 'overview' && (
                        <div className="space-y-6 max-w-[1400px] mx-auto">
                            <div className="flex gap-5">
                                <MetricCard label={activeBot === 'grievance' ? 'total users' : 'processed'} value={activeBot === 'grievance' ? stats?.users?.total : monitorData?.metrics?.assistant?.total_requests} icon={Users} color="indigo" />
                                <MetricCard label={activeBot === 'grievance' ? 'tickets' : 'throughput'} value={activeBot === 'grievance' ? complaints.length : `${monitorData?.metrics?.assistant?.success_rate || 100}%`} icon={BarChart3} color="emerald" />
                                <MetricCard label={activeBot === 'grievance' ? 'alerts' : 'errors'} value={activeBot === 'grievance' ? emergencyList.length : monitorData?.metrics?.assistant?.total_errors} icon={AlertCircle} color="rose" />
                                <MetricCard label="latency" value={activeBot === 'grievance' ? stats?.complaints?.avg_resolution : (monitorData?.metrics?.assistant?.avg_latency || 0).toFixed(0)} unit={activeBot === 'grievance' ? 'h' : 'ms'} icon={Clock} color="amber" />
                            </div>

                            <div className="bg-white border-2 border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                                <div className="px-8 py-5 border-b border-slate-50 bg-slate-50/20">
                                    <h3 className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] flex items-center gap-3">
                                        <TerminalIcon size={14} strokeWidth={3} className="text-indigo-600" /> realtime_activity_feed
                                    </h3>
                                </div>
                                <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {botLogs.slice(0, 30).map((log, ix) => (
                                        <div key={ix} className="flex gap-8 text-[12px] items-center px-8 py-4 hover:bg-slate-50/30 transition-all group">
                                            <span className="text-slate-300 w-16 shrink-0 font-black font-mono text-[10px] text-right whitespace-nowrap">{new Date(log.timestamp || Date.now()).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
                                            <span className={`text-[8px] uppercase font-black px-2.5 py-0.5 rounded-lg border ${log.level === 'error' ? 'border-rose-100 bg-rose-50 text-rose-500' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>{log.level || 'info'}</span>
                                            <span className="text-slate-600 font-bold truncate tracking-tight">{log.message}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activePanel === 'analytics' && (
                        <div className="bg-white border-2 border-slate-100 rounded-3xl shadow-sm overflow-hidden max-w-[1400px] mx-auto animate-in fade-in duration-500">
                            <table className="w-full text-left table-fixed">
                                <thead className="text-[9px] text-slate-400 uppercase tracking-widest border-b-2 border-slate-100 bg-slate-50/30">
                                    <tr>
                                        <th className="px-8 py-6 font-black w-[25%] whitespace-nowrap">Timestamp</th>
                                        <th className="px-8 py-6 font-black w-[15%] whitespace-nowrap">Level</th>
                                        <th className="px-8 py-6 font-black w-[45%] whitespace-nowrap">Payload</th>
                                        <th className="px-8 py-6 text-right font-black w-[15%] whitespace-nowrap">Node</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {botLogs.map((log, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-all font-bold text-slate-600 text-[12px]">
                                            <td className="px-8 py-5 text-slate-400 font-mono flex items-center gap-3 whitespace-nowrap">
                                                <Calendar size={12} className="text-indigo-200" /> {new Date(log.timestamp).toLocaleDateString()}
                                                <Watch size={12} className="text-indigo-200" /> {new Date(log.timestamp).toLocaleTimeString([], { hour12:false })}
                                            </td>
                                            <td className="px-8 py-5 whitespace-nowrap">
                                                <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase ${log.level === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100 shadow-sm shadow-rose-50' : 'bg-slate-50 text-slate-400'}`}>{log.level || 'info'}</span>
                                            </td>
                                            <td className={`px-8 py-5 tracking-tight truncate ${log.level === 'error' ? 'text-rose-700 font-bold' : 'text-slate-600'}`}>{log.message}</td>
                                            <td className="px-8 py-5 text-right text-slate-200 font-black font-mono whitespace-nowrap italic">#{i}</td>
                                        </tr>
                                    ))}
                                    {botLogs.length === 0 && <tr><td colSpan="4" className="py-20 text-center text-xs text-slate-200 font-black uppercase tracking-[0.5em] italic">Packet_Buffer_Empty</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activePanel === 'users' && (
                        <div className="bg-white border-2 border-slate-100 rounded-3xl shadow-sm overflow-hidden max-w-[1400px] mx-auto animate-in fade-in duration-500">
                             <table className="w-full text-left table-fixed">
                                <thead className="text-[9px] text-slate-400 uppercase tracking-widest border-b-2 border-slate-100 bg-slate-50/30">
                                    <tr>
                                        <th className="px-8 py-6 font-black w-[30%] whitespace-nowrap">Identity handle</th>
                                        <th className="px-8 py-6 font-black w-[30%] whitespace-nowrap">Comm protocols</th>
                                        <th className="px-8 py-6 font-black w-[20%] whitespace-nowrap">Operational cluster</th>
                                        <th className="px-8 py-6 text-right font-black w-[20%] whitespace-nowrap">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {users.map(u => (
                                        <tr key={u?._id} className="hover:bg-slate-50 transition-all font-bold text-slate-600 text-[13px]">
                                            <td className="px-8 py-4 text-slate-800 flex items-center gap-4 whitespace-nowrap">
                                                <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center font-black text-xs shadow-lg leading-none">{u?.name?.substring(0,1) || "U"}</div>
                                                <span className="tracking-tighter lowercase">{u?.name || "unidentified_user"}</span>
                                            </td>
                                            <td className="px-8 py-4 text-slate-400 lowercase whitespace-nowrap overflow-hidden text-ellipsis">
                                                <div className="flex items-center gap-3"><Mail size={12} className="text-slate-200" /> {u?.email || 'nil_index'}</div>
                                            </td>
                                            <td className="px-8 py-4 uppercase font-black text-slate-300 text-[9px] tracking-widest italic">{u?.department || 'general'}</td>
                                            <td className="px-8 py-4 text-right whitespace-nowrap">
                                                <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 ${u?.verified ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-slate-50 text-slate-200 border-slate-100'}`}>{u?.verified ? 'Verified' : 'Pending'}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    )}

                    {(activePanel === 'tickets' || activePanel === 'history' || activePanel === 'grievance') && (
                        <div className="bg-white border-2 border-slate-100 rounded-3xl shadow-sm overflow-hidden max-w-[1400px] mx-auto animate-in fade-in duration-500">
                            <table className="w-full text-left table-fixed">
                                <thead className="text-[9px] text-slate-400 uppercase tracking-widest border-b-2 border-slate-100 bg-slate-50/30">
                                    <tr>
                                        <th className="px-8 py-6 font-black w-[25%] whitespace-nowrap">Identification</th>
                                        <th className="px-8 py-6 font-black w-[20%] whitespace-nowrap">Current state</th>
                                        <th className="px-8 py-6 font-black w-[30%] whitespace-nowrap">Operational dept</th>
                                        <th className="px-8 py-6 text-right font-black w-[25%] whitespace-nowrap">Management</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {(activePanel === 'tickets' ? activeTickets : activePanel === 'grievance' ? emergencyList : pastHistory).map(cl => (
                                        <tr key={cl?._id} className="hover:bg-slate-50/50 transition-all font-bold text-slate-600 text-[13px]">
                                            <td className="px-8 py-6 font-black text-blue-600 font-mono tracking-tighter flex items-center gap-4 whitespace-nowrap uppercase italic">
                                                {(activeBot === 'grievance' && cl?.is_emergency) && <ShieldAlert size={16} className="text-rose-500" />}
                                                {formatId(cl?.complaint_id)}
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap">
                                                <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter shadow-sm ${cl?.status === 'resolved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : cl?.status === 'rejected' ? 'bg-rose-50 text-rose-500 border border-rose-100' : 'bg-slate-50 text-slate-400'}`}>{cl?.status?.replace('_',' ')}</span>
                                            </td>
                                            <td className="px-8 py-6 font-bold text-slate-400 lowercase whitespace-nowrap truncate">{cl?.category}</td>
                                            <td className="px-8 py-6 text-right space-x-6 whitespace-nowrap">
                                                {(activePanel === 'tickets' || activePanel === 'grievance') ? (
                                                    <><button onClick={() => handle(cl.complaint_id, 'resolve')} className="text-emerald-500 hover:text-indigo-600 font-black uppercase text-[10px] tracking-widest border-b-2 border-emerald-50 hover:border-indigo-600 pb-0.5">Approve</button>
                                                    <button onClick={() => handle(cl.complaint_id, 'reject')} className="text-rose-400 hover:text-rose-600 font-black uppercase text-[10px] tracking-widest border-b-2 border-rose-50 hover:border-rose-600 pb-0.5">Reject</button></>
                                                ) : <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest font-mono italic">{new Date(cl?.updated_at || Date.now()).toLocaleDateString()}</span>}
                                            </td>
                                        </tr>
                                    ))}
                                    {((activePanel === 'tickets' && activeTickets.length === 0) || (activePanel === 'history' && pastHistory.length === 0) || (activePanel === 'grievance' && emergencyList.length === 0)) && (
                                        <tr><td colSpan="4" className="py-20 text-center text-xs text-slate-200 font-black uppercase tracking-[0.4em] italic">No active_index found</td></tr>
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
