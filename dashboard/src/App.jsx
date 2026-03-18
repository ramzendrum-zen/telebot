/* VERSION 8.0.0 - MSAJCE TERMINAL DASHBOARD - MODERN SAAS OVERHAUL */
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
    LayoutDashboard, Ticket, ShieldAlert, Users, 
    Activity, Settings, Terminal, Box, History, UserCircle,
    Bell, User
} from 'lucide-react';

const App = () => {
    const [activeBot, setActiveBot] = useState('grievance'); // Default to grievance as in template
    const [activePanel, setActivePanel] = useState('overview');
    const [complaints, setComplaints] = useState([]);
    const [stats, setStats] = useState(null);
    const [monitorData, setMonitorData] = useState({ logs: [], metrics: { assistant: {}, grievance: {} } });
    const [userList, setUserList] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [c, s, m, u] = await Promise.all([
                axios.get('/api/admin/complaints').catch(() => ({ data: [] })),
                axios.get('/api/admin/stats').catch(() => ({ data: null })),
                axios.get('/api/monitor').catch(() => ({ data: { logs: [], metrics: {} } })),
                axios.get('/api/admin/users').catch(() => ({ data: [] }))
            ]);
            setComplaints(c.data || []);
            setStats(s.data);
            setMonitorData(m.data || { logs: [], metrics: {} });
            setUserList(u.data || []);
            setLoading(false);
        } catch (e) { 
            console.error(e);
            setLoading(false); 
        }
    };

    useEffect(() => {
        fetchData();
        const t = setInterval(fetchData, 10000);
        return () => clearInterval(t);
    }, []);

    const navItems = useMemo(() => {
        const items = [
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'tickets', label: 'Tickets', icon: Ticket },
            { id: 'grievance', label: 'Grievance', icon: ShieldAlert, badge: (complaints || []).filter(cl => cl.is_emergency && cl.status !== 'resolved' && cl.status !== 'rejected').length },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'analytics', label: 'Analytics', icon: Activity },
            { id: 'settings', label: 'Settings', icon: Settings },
        ];
        return items;
    }, [complaints]);

    const activeEmergencies = useMemo(() => {
        return (complaints || []).filter(c => c.is_emergency && c.status !== 'resolved' && c.status !== 'rejected');
    }, [complaints]);

    const handleAction = async (id, action) => {
        try { 
            await axios.post(`/api/admin/complaints/${id}/action`, { action }); 
            fetchData(); 
        } catch (e) {}
    };

    if (loading && !stats) return <div className="h-screen flex items-center justify-center bg-bg text-muted">Booting SaaS Kernel...</div>;

    return (
        <div className="flex h-screen bg-bg antialiased">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r flex flex-col justify-between shadow-sm z-50">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold">M</div>
                        <h1 className="text-xl font-bold tracking-tight text-text">MSAJCE</h1>
                    </div>

                    <nav className="space-y-1">
                        {navItems.map(item => (
                            <div 
                                key={item.id}
                                onClick={() => setActivePanel(item.id)}
                                className={`sidebar-item ${activePanel === item.id ? 'active' : ''}`}
                            >
                                <item.icon size={18} strokeWidth={2} />
                                <span className="flex-1">{item.label}</span>
                                {item.badge > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                        {item.badge}
                                    </span>
                                )}
                            </div>
                        ))}
                    </nav>
                </div>

                <div className="p-6 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted">
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                        Secure link established
                    </div>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar */}
                <header className="h-20 bg-white border-b flex justify-between items-center px-8 shrink-0">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-text">
                            {navItems.find(i => i.id === activePanel)?.label} Overview
                        </h2>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex bg-slate-100 rounded-xl p-1 shadow-inner border border-slate-200/50">
                            <button 
                                onClick={() => setActiveBot('assistant')}
                                className={`tab-btn ${activeBot === 'assistant' ? 'active shadow-sm' : ''}`}
                            >
                                Academic
                            </button>
                            <button 
                                onClick={() => setActiveBot('grievance')}
                                className={`tab-btn ${activeBot === 'grievance' ? 'active shadow-sm' : ''}`}
                            >
                                Grievance
                            </button>
                        </div>
                        
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-muted hover:text-text transition-colors cursor-pointer border">
                            <User size={20} />
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {activePanel === 'overview' && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            {/* Cards */}
                            <div className="grid grid-cols-4 gap-6">
                                <div className="card">
                                    <p className="card-title">Total {activeBot === 'grievance' ? 'Users' : 'Queries'}</p>
                                    <h2 className="card-value">
                                        {activeBot === 'grievance' ? stats?.users?.total : monitorData?.metrics?.assistant?.total_requests ?? 0}
                                    </h2>
                                </div>

                                <div className="card">
                                    <p className="card-title">{activeBot === 'grievance' ? 'Active Tickets' : 'Success Rate'}</p>
                                    <h2 className="card-value">
                                        {activeBot === 'grievance' ? stats?.complaints?.total : `${monitorData?.metrics?.assistant?.success_rate || 100}%`}
                                    </h2>
                                </div>

                                <div className="card">
                                    <p className="card-title">{activeBot === 'grievance' ? 'Emergency Alerts' : 'System Errors'}</p>
                                    <h2 className={`card-value ${activeBot === 'grievance' && stats?.complaints?.emergency > 0 ? 'text-red-500' : 'text-text'}`}>
                                        {activeBot === 'grievance' ? stats?.complaints?.emergency : monitorData?.metrics?.assistant?.total_errors ?? 0}
                                    </h2>
                                </div>

                                <div className="card">
                                    <p className="card-title">{activeBot === 'grievance' ? 'Avg Resolution' : 'Avg Latency'}</p>
                                    <h2 className="card-value">
                                        {activeBot === 'grievance' ? stats?.complaints?.avg_resolution : (monitorData?.metrics?.assistant?.avg_latency || 0).toFixed(0)}
                                        <span className="text-sm ml-1 font-normal text-muted">{activeBot === 'grievance' ? 'h' : 'ms'}</span>
                                    </h2>
                                </div>
                            </div>

                            {/* Logs */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-bold text-text flex items-center gap-2">
                                        <Terminal size={18} className="text-primary" /> Realtime Activity
                                    </h3>
                                    <span className="text-xs text-muted font-medium uppercase tracking-widest">Pulse Stream</span>
                                </div>

                                <div className="space-y-1">
                                    {(monitorData.logs || []).slice(0, 50).map((log, i) => (
                                        <div key={i} className="log-item">
                                            <span className="log-time">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                            <span className={`badge ${log.bot === 'assistant' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                                {log.bot}
                                            </span>
                                            <span className="text-slate-700">{log.message}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activePanel === 'grievance' && (
                        <div className="space-y-6">
                            {activeEmergencies.map(c => (
                                <div key={c.complaint_id} className="bg-white rounded-2xl p-8 border-l-4 border-l-red-500 shadow-sm border border-slate-100">
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className="font-bold text-red-600 flex items-center gap-2">
                                            <ShieldAlert size={18} /> {c.category}
                                        </h4>
                                        <span className="text-xs font-mono text-muted">{c.complaint_id}</span>
                                    </div>
                                    <p className="text-lg text-slate-800 mb-8 leading-relaxed">{c.description}</p>
                                    <div className="flex gap-8 text-sm text-muted mb-8 border-t pt-6">
                                        <span className="flex items-center gap-2"><Box size={16}/> {c.location || 'Campus'}</span>
                                        <span className="flex items-center gap-2"><Activity size={16}/> {new Date(c.created_at).toLocaleString()}</span>
                                    </div>
                                    <button 
                                        onClick={() => handleAction(c.complaint_id, 'resolve')}
                                        className="w-full bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg active:scale-[0.98]"
                                    >
                                        Resolve and Send Notification
                                    </button>
                                </div>
                            ))}
                            {activeEmergencies.length === 0 && (
                                <div className="py-40 text-center text-muted">
                                    <ShieldAlert size={48} className="mx-auto mb-4 opacity-10" />
                                    <p className="text-lg font-medium">No active emergency alerts at this time.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activePanel === 'tickets' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 text-xs font-bold text-muted uppercase tracking-widest">
                                        <th className="px-8 py-5">Ticket ID</th>
                                        <th className="px-8 py-5">Status</th>
                                        <th className="px-8 py-5">Department</th>
                                        <th className="px-8 py-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {complaints.filter(c => !c.is_emergency && c.status !== 'resolved' && c.status !== 'rejected').map(c => (
                                        <tr key={c.complaint_id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-5 font-bold text-primary">{c.complaint_id}</td>
                                            <td className="px-8 py-5">
                                                <span className="badge">{c.status}</span>
                                            </td>
                                            <td className="px-8 py-5 text-slate-700">{c.category}</td>
                                            <td className="px-8 py-5 text-right space-x-4">
                                                <button onClick={() => handleAction(c.complaint_id, 'resolve')} className="text-green-600 font-bold hover:text-green-800">Approve</button>
                                                <button onClick={() => handleAction(c.complaint_id, 'reject')} className="text-red-500 font-bold hover:text-red-700">Reject</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activePanel === 'history' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 text-xs font-bold text-muted uppercase tracking-widest">
                                        <th className="px-8 py-5">History ID</th>
                                        <th className="px-8 py-5">Resolution</th>
                                        <th className="px-8 py-5 text-right">Closed At</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {complaints.filter(c => c.status === 'resolved' || c.status === 'rejected').map(c => (
                                        <tr key={c.complaint_id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-5 font-medium">{c.complaint_id}</td>
                                            <td className="px-8 py-5">
                                                <span className={`badge ${c.status === 'resolved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                    {c.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right text-muted">{new Date(c.updated_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activePanel === 'users' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 text-xs font-bold text-muted uppercase tracking-widest">
                                        <th className="px-8 py-5">Full Name</th>
                                        <th className="px-8 py-5">Registration/Emp</th>
                                        <th className="px-8 py-5 text-right">Verification</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {userList.map(u => (
                                        <tr key={u._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-5 font-bold text-text">{u.name || "System User"}</td>
                                            <td className="px-8 py-5 text-primary font-medium">{u.register_number || u.employee_id || 'Ext'}</td>
                                            <td className="px-10 py-5 text-right">
                                                <span className={`badge ${u.verified ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    {u.verified ? 'Verified' : 'Pending'}
                                                </span>
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
