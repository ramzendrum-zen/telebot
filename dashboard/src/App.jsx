/* VERSION 13.3.0 - MSAJCE TERMINAL - ABSOLUTE BLACK */
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
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 text-center">
            <AlertOctagon size={40} className="text-rose-500 mb-4" />
            <h1 className="text-lg font-black text-slate-950 uppercase tracking-widest mb-2">Protocol Error</h1>
            <p className="text-xs text-slate-950 font-medium lowercase">Interface sync failure. Attempting black-node recovery...</p>
            <button onClick={() => window.location.reload()} className="mt-8 px-6 py-2.5 bg-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">Handshake</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const MetricCard = ({ label, value, icon: Icon, unit = "" }) => {
    return (
        <div className="bg-white border-2 border-slate-950 p-5 rounded-2xl shadow-sm hover:scale-[1.02] transition-all flex-1 min-w-[200px]">
            <div className="flex items-center gap-2.5 mb-2.5">
                <div className="text-slate-950">
                    {Icon ? <Icon size={14} strokeWidth={3} /> : <Activity size={14} strokeWidth={3} />}
                </div>
                <span className="text-[10px] text-slate-950 font-black uppercase tracking-[0.2em]">{label}</span>
            </div>
            <div className="text-2xl text-slate-950 font-black tracking-tighter">
                {value ?? 0}<span className="text-xs ml-0.5 text-slate-950/40 font-black uppercase">{unit}</span>
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
            setLastSync(new Date().toLocaleTimeString([], { hour12:false }));
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
            { id: 'grievance', label: 'Emergency alerts', icon: Shield, badge: (complaints || []).filter(cl => cl && cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected').length }, 
            { id: 'users', label: 'User database', icon: UserCircle }, 
            { id: 'history', label: 'Archive history', icon: History },
            common[1], 
            common[2] 
        ];
    }, [activeBot, complaints]);

    const formatId = (id) => {
        if (!id) return 'GRV-X';
        const rawId = id.toString().startsWith('grv-') ? id : `grv-${id.toString().substring(id.toString().length - 4)}`;
        return rawId.toUpperCase();
    };

    const handle = async (id, action) => {
        try { await axios.post(`/api/admin/complaints/${id}/action`, { action }); pull(); } catch (e) {}
    };

    if (loading && !stats) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
            <div className="w-8 h-8 bg-slate-950 rounded-xl animate-spin scale-150"></div>
            <div className="text-[10px] font-black text-slate-950 uppercase tracking-[1em]">secure_kernel_linking</div>
        </div>
    );

    const botLogs = (monitorData?.logs || []).filter(l => l && l.bot === activeBot);
    const activeTickets = complaints.filter(cl => cl && !cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected');
    const emergencyList = complaints.filter(cl => cl && cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected');
    const pastHistory = complaints.filter(cl => cl && (cl.status === 'resolved' || cl.status === 'rejected'));

    return (
        <div className="flex h-screen bg-white text-slate-950 font-['Inter',sans-serif] selection:bg-slate-950 selection:text-white antialiased overflow-hidden">
            {/* Sidebar */}
            <aside className="w-56 bg-white border-r-2 border-slate-50 flex flex-col shrink-0 z-50">
                <div className="p-6 pb-10 flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-950 text-white flex items-center justify-center font-black text-xs rounded-xl">M</div>
                    <span className="text-[14px] tracking-widest text-slate-950 font-black uppercase">msajce</span>
                </div>
                
                <nav className="flex-1 px-4 space-y-2">
                    {nav.map(item => (
                        <button key={item.id} onClick={() => setActivePanel(item.id)} className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all duration-300 group ${activePanel === item.id ? 'bg-slate-950 text-white shadow-2xl' : 'text-slate-950/40 hover:text-slate-950 hover:bg-slate-50'}`}>
                            <div className="flex items-center gap-5">
                                <span className={`w-4 flex justify-center ${activePanel === item.id ? "text-white" : "text-slate-200 group-hover:text-slate-950"}`}>
                                    {item.icon && <item.icon size={16} strokeWidth={3} />}
                                </span>
                                <span className="text-[12px] font-black uppercase tracking-tight">{item.label}</span>
                            </div>
                            {item.badge > 0 && <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${activePanel === item.id ? "bg-white text-slate-950" : "bg-slate-950 text-white"}`}>{item.badge}</span>}
                        </button>
                    ))}
                </nav>

                <div className="p-8">
                    <div className="bg-slate-50 p-5 rounded-2xl border-2 border-slate-100">
                        <div className="text-[9px] text-slate-950 font-black tracking-widest uppercase mb-1">active_sync</div>
                        <div className="text-[8px] text-slate-400 font-bold tracking-widest uppercase">node_v13.3 / {lastSync}</div>
                    </div>
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-16 bg-white border-b-2 border-slate-50 flex items-center justify-between px-10 shrink-0">
                    <div className="flex items-center gap-4 text-[11px] text-slate-950 font-black uppercase tracking-widest">
                        {activeBot} // {activePanel}
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="flex bg-slate-50 p-1 rounded-xl gap-1 border-2 border-slate-100">
                            <button onClick={() => setActiveBot('assistant')} className={`px-8 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeBot === 'assistant' ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-950/40 hover:text-slate-950'}`}>Assistant</button>
                            <button onClick={() => setActiveBot('grievance')} className={`px-8 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeBot === 'grievance' ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-950/40 hover:text-slate-950'}`}>Grievance</button>
                        </div>
                        <User size={20} strokeWidth={3} className="text-slate-950" />
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-white">
                    {activePanel === 'overview' && (
                        <div className="space-y-8 max-w-[1400px] mx-auto">
                            <div className="flex gap-6">
                                <MetricCard label={activeBot === 'grievance' ? 'users' : 'processed'} value={activeBot === 'grievance' ? stats?.users?.total : monitorData?.metrics?.assistant?.total_requests} icon={Users} />
                                <MetricCard label={activeBot === 'grievance' ? 'tickets' : 'success'} value={activeBot === 'grievance' ? complaints.length : `${monitorData?.metrics?.assistant?.success_rate || 100}%`} icon={BarChart3} />
                                <MetricCard label={activeBot === 'grievance' ? 'alerts' : 'errors'} value={activeBot === 'grievance' ? emergencyList.length : monitorData?.metrics?.assistant?.total_errors} icon={AlertCircle} />
                                <MetricCard label="speed" value={activeBot === 'grievance' ? stats?.complaints?.avg_resolution : (monitorData?.metrics?.assistant?.avg_latency || 0).toFixed(0)} unit={activeBot === 'grievance' ? 'h' : 'ms'} icon={Clock} />
                            </div>

                            <div className="bg-white border-2 border-slate-950 rounded-[2.5rem] shadow-sm overflow-hidden">
                                <div className="px-10 py-6 border-b border-slate-50">
                                    <h3 className="text-[11px] text-slate-950 font-black uppercase tracking-[0.4em] flex items-center gap-4">
                                        <TerminalIcon size={16} strokeWidth={4} /> activity_telemetry_secure
                                    </h3>
                                </div>
                                <div className="divide-y-2 divide-slate-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {botLogs.slice(0, 30).map((log, ix) => (
                                        <div key={ix} className="flex gap-10 text-[13px] items-center px-10 py-5 hover:bg-slate-50 transition-all">
                                            <span className="text-slate-950/20 w-16 shrink-0 font-black font-mono text-[10px] text-right">{new Date(log.timestamp || Date.now()).toLocaleTimeString([], { hour12:false })}</span>
                                            <span className={`text-[9px] font-black px-3 py-1 rounded-lg border-2 ${log.level === 'error' ? 'bg-slate-950 text-white border-slate-950' : 'bg-white text-slate-950 border-slate-950'}`}>{log.level || 'info'}</span>
                                            <span className="text-slate-950 font-black truncate tracking-tight">{log.message}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activePanel === 'analytics' && (
                        <div className="bg-white border-2 border-slate-950 rounded-[2.5rem] shadow-sm overflow-hidden max-w-[1400px] mx-auto animate-in fade-in duration-500">
                             <table className="w-full text-left table-fixed">
                                <thead className="text-[10px] text-slate-950 font-black uppercase tracking-widest border-b-2 border-slate-950 bg-slate-50">
                                    <tr>
                                        <th className="px-10 py-8 w-[25%] uppercase">Time index</th>
                                        <th className="px-10 py-8 w-[15%] uppercase">Level</th>
                                        <th className="px-10 py-8 w-[45%] uppercase">Payload</th>
                                        <th className="px-10 py-8 text-right w-[15%] uppercase">Index</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-slate-50 text-slate-950 font-black">
                                    {botLogs.map((log, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-all text-[13px]">
                                            <td className="px-10 py-6 font-mono flex items-center gap-3">
                                                <Calendar size={12} strokeWidth={3} /> {new Date(log.timestamp).toLocaleDateString()}
                                                <Watch size={12} strokeWidth={3} className="ml-2" /> {new Date(log.timestamp).toLocaleTimeString([], { hour12:false })}
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className={`px-4 py-1.5 rounded-xl text-[9px] ${log.level === 'error' ? 'bg-slate-950 text-white shadow-xl' : 'bg-white border-2 border-slate-950'}`}>{log.level || 'info'}</span>
                                            </td>
                                            <td className="px-10 py-6 truncate tracking-tighter uppercase">{log.message}</td>
                                            <td className="px-10 py-6 text-right text-slate-950/20 font-mono italic">#{i}</td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    )}

                    {activePanel === 'users' && (
                        <div className="bg-white border-2 border-slate-950 rounded-[2.5rem] shadow-sm overflow-hidden max-w-[1400px] mx-auto animate-in fade-in duration-500">
                             <table className="w-full text-left table-fixed">
                                <thead className="text-[10px] text-slate-950 font-black uppercase tracking-widest border-b-2 border-slate-950 bg-slate-50">
                                    <tr>
                                        <th className="px-10 py-8 w-[35%] uppercase">Identity handle</th>
                                        <th className="px-10 py-8 w-[35%] uppercase">Access protocol</th>
                                        <th className="px-10 py-8 w-[15%] uppercase">Dept</th>
                                        <th className="px-10 py-8 text-right w-[15%] uppercase">Auth</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-slate-50 text-slate-950 font-black">
                                    {users.map(u => (
                                        <tr key={u?._id} className="hover:bg-slate-50 transition-all text-[13px]">
                                            <td className="px-10 py-7 lowercase tracking-tighter">{u?.name || "unidentified"}</td>
                                            <td className="px-10 py-7 lowercase tracking-tighter flex items-center gap-3 mt-1.5"><Mail size={12} strokeWidth={3} /> {u?.email || 'nil'}</td>
                                            <td className="px-10 py-7 uppercase text-[10px] italic">{u?.department || 'ops'}</td>
                                            <td className="px-10 py-7 text-right">
                                                <span className={`px-5 py-2 rounded-2xl text-[9px] border-4 ${u?.verified ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-50 bg-white text-slate-200 uppercase'}`}>{u?.verified ? 'SAFE' : 'PEND'}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    )}

                    {(activePanel === 'tickets' || activePanel === 'history' || activePanel === 'grievance') && (
                        <div className="bg-white border-2 border-slate-950 rounded-[2.5rem] shadow-sm overflow-hidden max-w-[1400px] mx-auto animate-in fade-in duration-500">
                            <table className="w-full text-left table-fixed">
                                <thead className="text-[10px] text-slate-950 font-black uppercase tracking-widest border-b-2 border-slate-950 bg-slate-50">
                                    <tr>
                                        <th className="px-10 py-8 w-[25%] uppercase">Id handle</th>
                                        <th className="px-10 py-8 w-[20%] uppercase">Sts</th>
                                        <th className="px-10 py-8 w-[35%] uppercase">Operational dept index</th>
                                        <th className="px-10 py-8 text-right w-[20%] uppercase">Suite</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-slate-50 text-slate-950 font-black">
                                    {(activePanel === 'tickets' ? activeTickets : activePanel === 'grievance' ? emergencyList : pastHistory).map(cl => (
                                        <tr key={cl?._id} className="hover:bg-slate-50/50 transition-all text-[14px]">
                                            <td className="px-10 py-8 text-blue-600 font-mono tracking-tighter flex items-center gap-5 uppercase italic">
                                                {(activeBot === 'grievance' && cl?.is_emergency) && <ShieldAlert size={18} strokeWidth={3} className="text-rose-600 animate-pulse" />}
                                                {formatId(cl?.complaint_id)}
                                            </td>
                                            <td className="px-10 py-8">
                                                <span className={`px-5 py-2 rounded-2xl text-[10px] shadow-sm ${cl?.status === 'resolved' ? 'bg-slate-950 text-white' : cl?.status === 'rejected' ? 'bg-rose-600 text-white shadow-xl shadow-rose-100' : 'bg-white border-2 border-slate-950'}`}>{cl?.status?.replace('_',' ')}</span>
                                            </td>
                                            <td className="px-10 py-8 lowercase tracking-tight">{cl?.category}</td>
                                            <td className="px-10 py-8 text-right space-x-8">
                                                {(activePanel === 'tickets' || activePanel === 'grievance') ? (
                                                    <><button onClick={() => handle(cl.complaint_id, 'resolve')} className="text-slate-950 hover:bg-slate-950 hover:text-white px-4 py-2 rounded-xl border-2 border-slate-950 transition-all uppercase text-[10px]">Approve</button>
                                                    <button onClick={() => handle(cl.complaint_id, 'reject')} className="text-rose-600 hover:bg-rose-600 hover:text-white px-4 py-2 rounded-xl border-2 border-rose-600 transition-all uppercase text-[10px]">Reject</button></>
                                                ) : <span className="text-[11px] uppercase tracking-widest font-mono italic opacity-30">{new Date(cl?.updated_at || Date.now()).toLocaleDateString()}</span>}
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

const App = () => (
  <ErrorBoundary>
    <Dashboard />
  </ErrorBoundary>
);

export default App;
