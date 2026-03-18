/* VERSION 6.0.0 - MSAJCE TERMINAL DASHBOARD - COMPACT ELEGANCE */
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import * as Lucide from 'lucide-react';

const SafeIcon = ({ icon: Icon, ...props }) => {
    if (!Icon) return <Lucide.Activity {...props} />;
    return <Icon {...props} />;
};

const StatCard = ({ label, value, icon: Icon, color = "blue", unit = "" }) => {
    const iconColors = {
        blue: 'text-blue-500',
        red: 'text-rose-500',
        green: 'text-emerald-500',
        amber: 'text-amber-500'
    };
    return (
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-1 transition-all hover:border-blue-100">
            <div className="flex items-center justify-between mb-2">
               <div className={`${iconColors[color] || 'text-slate-400'}`}>
                   <SafeIcon icon={Icon} size={16} strokeWidth={1.5} />
               </div>
               <div className="text-[8px] text-slate-300 font-light tracking-widest uppercase">system log</div>
            </div>
            <div className="text-xl text-slate-800 tracking-tight font-normal">
                {value ?? 0}<span className="text-xs ml-0.5 text-slate-400">{unit}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-normal lowercase">{label}</span>
        </div>
    );
};

const ErrorBoundary = ({ children }) => {
    const [hasError, setHasError] = React.useState(false);
    React.useEffect(() => {
        const handleError = (e) => { console.error(e); setHasError(true); };
        window.addEventListener('error', handleError);
        return () => window.removeEventListener('error', handleError);
    }, []);
    if (hasError) return <div className="p-10 font-normal text-xs lowercase">terminal module recovery required.</div>;
    return children;
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

    const fetchData = async () => {
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
        fetchData();
        const t = setInterval(fetchData, 15000);
        return () => clearInterval(t);
    }, []);

    const handleAction = async (id, action) => {
        try { await axios.post(`/api/admin/complaints/${id}/action`, { action }); fetchData(); } catch (e) {}
    };

    const navItems = useMemo(() => {
        const common = [
            { id: 'overview', label: 'overview dashboard', icon: Lucide.Home },
            { id: 'analytics', label: 'system analytics', icon: Lucide.Activity },
            { id: 'settings', label: 'admin settings', icon: Lucide.Settings },
        ];
        if (activeBot === 'assistant') {
            return [ common[0], { id: 'assistant', label: 'academic assistant', icon: Lucide.Cpu }, common[1], common[2] ];
        }
        return [ 
            common[0], 
            { id: 'tickets', label: 'active tickets', icon: Lucide.Inbox }, 
            { id: 'grievance', label: 'grievance portal', icon: Lucide.Shield, badge: (complaints || []).filter(c => c.is_emergency && c.status !== 'resolved' && c.status !== 'rejected').length }, 
            { id: 'users', label: 'user registration', icon: Lucide.UserCircle }, 
            { id: 'history', label: 'complaints history', icon: Lucide.History },
            common[1], 
            common[2] 
        ];
    }, [activeBot, complaints]);

    if (loading && !stats) return <div className="min-h-screen bg-white flex items-center justify-center text-[10px] font-light lowercase tracking-widest text-slate-300">synchronizing terminal...</div>;

    const renderPanel = () => {
        switch (activePanel) {
            case 'overview':
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <StatCard label={activeBot === 'grievance' ? 'total users' : 'total queries'} value={activeBot === 'grievance' ? stats?.users?.total : monitorData?.metrics?.assistant?.total_requests} icon={Lucide.Users} color="blue" />
                            <StatCard label={activeBot === 'grievance' ? 'tickets active' : 'success rate'} value={activeBot === 'grievance' ? stats?.complaints?.total : `${monitorData?.metrics?.assistant?.success_rate || 100}%`} icon={Lucide.BarChart} color="green" />
                            <StatCard label={activeBot === 'grievance' ? 'emergency alerts' : 'system errors'} value={activeBot === 'grievance' ? stats?.complaints?.emergency : monitorData?.metrics?.assistant?.total_errors} icon={Lucide.AlertCircle} color="red" />
                            <StatCard label="avg resolution" value={activeBot === 'grievance' ? stats?.complaints?.avg_resolution : (monitorData?.metrics?.assistant?.avg_latency || 0).toFixed(0)} unit={activeBot === 'grievance' ? 'h' : 'ms'} icon={Lucide.Clock} color="amber" />
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                            <h3 className="text-[10px] text-slate-400 font-normal lowercase mb-4 flex items-center gap-2 tracking-wide">
                                <Lucide.Terminal size={12} strokeWidth={1} /> system telemetry logs
                            </h3>
                            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {(monitorData.logs || []).slice(0, 30).map((log, i) => (
                                    <div key={i} className="flex gap-4 text-[11px] items-center p-2 rounded-lg transition-colors  hover:bg-slate-50">
                                        <span className="text-slate-300 w-12 shrink-0 font-light">{new Date(log.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
                                        <div className={`w-1.5 h-1.5 rounded-full ${log.bot === 'assistant' ? 'bg-blue-300' : 'bg-slate-300'}`}></div>
                                        <span className="text-slate-500 font-light">{log.message}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 'grievance':
                return (
                    <div className="space-y-4">
                         {complaints.filter(c => c.is_emergency && c.status !== 'resolved' && c.status !== 'rejected').map(c => (
                            <div key={c.complaint_id} className="border border-slate-100 rounded-2xl p-6 bg-white shadow-sm">
                                <h4 className="text-[11px] text-rose-500 font-normal lowercase mb-4">{c.category}</h4>
                                <p className="text-xs font-light text-slate-600 mb-6 leading-relaxed border-l-2 border-slate-100 pl-4">{c.description}</p>
                                <div className="flex gap-6 text-[9px] text-slate-400 mb-6 font-light lowercase">
                                    <span>loc: {c.location || 'campus'}</span>
                                    <span>ts: {new Date(c.created_at).toLocaleTimeString()}</span>
                                    <span>user: {c.is_anonymous ? 'anon' : (c.student_id?.name || 'stu')}</span>
                                </div>
                                <button onClick={() => handleAction(c.complaint_id, 'resolve')} className="w-full bg-slate-800 text-white py-3 rounded-lg text-[10px] lowercase font-light hover:bg-black transition-all">resolve incident</button>
                            </div>
                        ))}
                    </div>
                );
            case 'tickets':
                return (
                    <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-[9px] text-slate-300 uppercase tracking-widest border-b border-slate-50">
                                    <tr><th className="px-6 py-4 font-normal">id</th><th className="px-6 py-4 font-normal">status</th><th className="px-6 py-4 font-normal">dept</th><th className="px-6 py-4 text-right">actions</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {complaints.filter(c => !c.is_emergency && c.status !== 'resolved' && c.status !== 'rejected').map(c => (
                                        <tr key={c.complaint_id} className="text-[11px] font-light lowercase text-slate-500">
                                            <td className="px-6 py-4">{c.complaint_id}</td>
                                            <td className="px-6 py-4">{c.status}</td>
                                            <td className="px-6 py-4">{c.category}</td>
                                            <td className="px-6 py-4 text-right space-x-3">
                                                <button onClick={() => handleAction(c.complaint_id, 'resolve')} className="text-emerald-500 hover:text-emerald-700">approve</button>
                                                <button onClick={() => handleAction(c.complaint_id, 'reject')} className="text-rose-400 hover:text-rose-600">reject</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'history':
                return (
                    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="text-[9px] text-slate-300 uppercase tracking-widest border-b border-slate-50">
                                <tr><th className="px-6 py-4 font-normal">id</th><th className="px-6 py-4 font-normal">status</th><th className="px-6 py-4">closed date</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {complaints.filter(c => c.status === 'resolved' || c.status === 'rejected').slice(0, 20).map(c => (
                                    <tr key={c.complaint_id} className="text-[11px] font-light text-slate-500 lowercase">
                                        <td className="px-6 py-4">{c.complaint_id}</td>
                                        <td className={`px-6 py-4 ${c.status === 'resolved' ? 'text-emerald-400' : 'text-rose-300'}`}>{c.status}</td>
                                        <td className="px-6 py-4 text-slate-300">{new Date(c.updated_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            case 'users':
                return (
                    <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="text-[9px] text-slate-300 uppercase tracking-widest border-b border-slate-50">
                                <tr><th className="px-6 py-4 font-normal">identity</th><th className="px-6 py-4 font-normal">dept</th><th className="px-6 py-4 text-right">status</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {users.map(u => (
                                    <tr key={u._id} className="text-[11px] font-light text-slate-500 lowercase">
                                        <td className="px-6 py-4 text-slate-700">{u.name || "sys user"}</td>
                                        <td className="px-6 py-4">{u.department || 'gen'}</td>
                                        <td className="px-6 py-4 text-right font-normal">{u.verified ? 'verified' : 'pending'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <ErrorBoundary>
            <div className="flex min-h-screen bg-[#fafbfc] text-slate-800 font-['Inter',sans-serif] selection:bg-slate-100 antialiased overflow-x-hidden">
                <aside className="w-56 bg-white border-r border-slate-50 flex flex-col fixed inset-y-0 z-50">
                    <div className="p-6 pb-8 flex items-center gap-3">
                        <div className="w-7 h-7 bg-slate-800 text-white flex items-center justify-center font-light text-xs rounded-lg">m</div>
                        <span className="text-[10px] tracking-[0.2em] text-slate-400 font-normal uppercase">msajce</span>
                    </div>
                    <nav className="flex-1 px-3 space-y-1">
                        {navItems.map(item => (
                            <button key={item.id} onClick={() => setActivePanel(item.id)} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 ${activePanel === item.id ? 'bg-slate-50 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
                                <div className="flex items-center gap-4">
                                    <span className="w-4 shrink-0 flex justify-center">{item.icon && <SafeIcon icon={item.icon} size={14} strokeWidth={1.5} className={activePanel === item.id ? "text-blue-500" : "text-slate-300"} />}</span>
                                    <span className="text-[11px] font-normal lowercase tracking-tight">{item.label}</span>
                                </div>
                                {item.badge > 0 && <span className="bg-rose-100 text-rose-500 text-[8px] px-1.5 py-0.5 rounded-full">{item.badge}</span>}
                            </button>
                        ))}
                    </nav>
                </aside>

                <main className="flex-1 ml-56 flex flex-col min-h-screen relative p-8">
                    <header className="flex items-center justify-between mb-10 pb-6 border-b border-slate-50">
                        <div>
                            <h2 className="text-xs text-slate-400 font-normal lowercase tracking-widest">{activePanel} dashboard</h2>
                            <div className="text-[9px] text-slate-300 lowercase mt-0.5">admin kernel v6.0 / sync {lastSync}</div>
                        </div>
                        <div className="flex bg-slate-50 p-1 rounded-xl gap-1">
                            <button onClick={() => setActiveBot('assistant')} className={`px-5 py-1.5 rounded-lg text-[9px] lowercase font-normal transition-all ${activeBot === 'assistant' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>assistant</button>
                            <button onClick={() => setActiveBot('grievance')} className={`px-5 py-1.5 rounded-lg text-[9px] lowercase font-normal transition-all ${activeBot === 'grievance' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>grievance</button>
                        </div>
                    </header>
                    <div className="max-w-5xl">{renderPanel()}</div>
                </main>
            </div>
        </ErrorBoundary>
    );
};

export default App;
