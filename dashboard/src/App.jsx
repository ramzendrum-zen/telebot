/* VERSION 4.0.0 - MSAJCE TERMINAL DASHBOARD - ELEGANT MINIMALIST */
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import * as Lucide from 'lucide-react';

const StatCard = ({ label, value, icon: Icon, color = "blue", unit = "" }) => {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1 h-full animate-in fade-in slide-in-from-bottom-2 duration-700">
            <div className="flex items-center justify-between mb-4">
               <div className="p-2 bg-slate-50 rounded-xl text-slate-400">
                   {Icon && <Icon size={18} strokeWidth={1.5} />}
               </div>
               <span className="text-[10px] text-slate-300 tracking-wider uppercase font-medium">Metrics Hub</span>
            </div>
            <div className="text-3xl text-slate-800 tracking-tight font-light transition-all">
                {value ?? 0}<span className="text-sm ml-0.5 text-slate-400">{unit}</span>
            </div>
            <span className="text-xs text-slate-400 font-normal">{label}</span>
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

    const fetchAllData = async () => {
        try {
            const [compRes, statsRes, monRes, usersRes] = await Promise.all([
                axios.get('/api/admin/complaints').catch(() => ({ data: [] })),
                axios.get('/api/admin/stats').catch(() => ({ data: null })),
                axios.get('/api/monitor').catch(() => ({ data: { logs: [], metrics: {} } })),
                axios.get('/api/admin/users').catch(() => ({ data: [] }))
            ]);
            setComplaints(compRes.data || []);
            setStats(statsRes.data);
            setMonitorData(monRes.data || { logs: [], metrics: {} });
            setUsers(usersRes.data || []);
            setLastSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            setLoading(false);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
        const interval = setInterval(fetchAllData, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleAction = async (id, action) => {
        try {
            await axios.post(`/api/admin/complaints/${id}/action`, { action });
            fetchAllData();
        } catch (e) { console.error(e); }
    };

    const activeEmergencies = useMemo(() => {
        return (complaints || []).filter(c => c.is_emergency && c.status !== 'resolved' && c.status !== 'rejected');
    }, [complaints]);

    const navItems = useMemo(() => {
        const common = [
            { id: 'overview', label: 'Overview Dashboard', icon: Lucide.Home },
            { id: 'analytics', label: 'System Analytics', icon: Lucide.Activity },
            { id: 'settings', label: 'Admin Settings', icon: Lucide.Settings },
        ];
        
        if (activeBot === 'assistant') {
            return [
                common[0], 
                { id: 'assistant', label: 'Academic Assistant', icon: Lucide.Cpu },
                common[1], 
                common[2], 
            ];
        } else {
            return [
                common[0], 
                { id: 'tickets', label: 'Active Tickets', icon: Lucide.Inbox },
                { id: 'grievance', label: 'Grievance Portal', icon: Lucide.Shield, badge: activeEmergencies.length },
                { id: 'users', label: 'User Registration', icon: Lucide.UserCircle },
                { id: 'history', label: 'Complaints History', icon: Lucide.History },
                common[1], 
                common[2], 
            ];
        }
    }, [activeBot, activeEmergencies.length]);

    useEffect(() => {
        if (!navItems.find(i => i.id === activePanel)) {
            setActivePanel('overview');
        }
    }, [activeBot, navItems]);

    if (loading && !stats) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
                <div className="w-10 h-10 border-2 border-slate-100 border-t-slate-800 rounded-full animate-spin"></div>
                <p className="text-[11px] text-slate-400 tracking-[0.2em] font-light">ELEGANCE LOADING...</p>
            </div>
        );
    }

    const renderPanelContent = () => {
        switch (activePanel) {
            case 'overview':
                return (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <StatCard 
                                label={activeBot === 'grievance' ? 'total users' : 'total queries'}
                                value={activeBot === 'grievance' ? stats?.users?.total : monitorData?.metrics?.assistant?.total_requests}
                                icon={Lucide.Users}
                            />
                            <StatCard 
                                label={activeBot === 'grievance' ? 'tickets active' : 'success rate'}
                                value={activeBot === 'grievance' ? stats?.complaints?.total : `${monitorData?.metrics?.assistant?.success_rate || 100}%`}
                                icon={Lucide.BarChart}
                            />
                            <StatCard 
                                label={activeBot === 'grievance' ? 'emergencies' : 'sys errors'}
                                value={activeBot === 'grievance' ? stats?.complaints?.emergency : monitorData?.metrics?.assistant?.total_errors}
                                icon={Lucide.AlertCircle}
                            />
                            <StatCard 
                                label="resolution avg"
                                value={activeBot === 'grievance' ? stats?.complaints?.avg_resolution : (monitorData?.metrics?.assistant?.avg_latency || 0).toFixed(0)}
                                unit={activeBot === 'grievance' ? 'h' : 'ms'}
                                icon={Lucide.Clock}
                            />
                        </div>

                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col min-h-[400px]">
                            <h3 className="text-xs text-slate-400 font-light mb-6 uppercase tracking-widest flex items-center gap-2">
                                <Lucide.Terminal size={12} strokeWidth={1} /> live system telemetry
                            </h3>
                            <div className="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar">
                                {(monitorData.logs || []).slice(0, 30).map((log, i) => (
                                    <div key={i} className="flex gap-6 text-[11px] items-center p-3 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-50">
                                        <span className="text-slate-300 shrink-0 font-light w-16">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
                                        <div className={`w-1 h-1 rounded-full ${log.bot === 'assistant' ? 'bg-slate-400' : 'bg-slate-300'}`}></div>
                                        <span className="text-slate-500 font-light leading-relaxed">{log.message}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 'grievance':
                return (
                    <div className="space-y-6">
                        <div className="p-8 space-y-8 bg-white border border-slate-100 rounded-3xl shadow-sm">
                            <h3 className="text-xs text-slate-400 font-light uppercase tracking-widest flex items-center gap-2">
                                <Lucide.AlertTriangle size={14} strokeWidth={1.5} /> emergency incident feed
                            </h3>
                            {activeEmergencies.length === 0 && <p className="text-center py-20 text-slate-300 text-xs font-light">No active emergency alerts detected</p>}
                            {activeEmergencies.map(c => (
                                <div key={c.complaint_id} className="border border-slate-50 rounded-3xl p-8 bg-slate-50/20 shadow-sm transition-all hover:shadow-md">
                                    <h4 className="text-xs text-slate-600 mb-4 flex items-center gap-2 font-normal">
                                        incident: {c.category}
                                    </h4>
                                    <p className="text-sm font-light text-slate-600 mb-6 leading-relaxed border-l border-slate-200 pl-6">{c.description}</p>
                                    <div className="flex flex-wrap gap-8 text-[10px] text-slate-400 mb-6 font-light">
                                        <span>location: {c.location || 'campus'}</span>
                                        <span>timestamp: {new Date(c.created_at).toLocaleTimeString()}</span>
                                        <span>report: {c.is_anonymous ? 'anonymous' : (c.student_id?.name || 'student')}</span>
                                    </div>
                                    <button onClick={() => handleAction(c.complaint_id, 'resolve')} className="w-full bg-slate-800 text-white py-4 rounded-2xl text-[10px] tracking-[0.2em] font-light hover:bg-black transition-all shadow-lg hover:shadow-xl">MARK AS RESOLVED</button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'tickets':
                return (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50 bg-slate-50/20 flex justify-between items-center">
                            <h3 className="text-xs text-slate-400 font-light uppercase tracking-widest">operational queue</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                    <tr>
                                        <th className="px-8 py-6 font-normal">ticket id</th>
                                        <th className="px-8 py-6 font-normal">status</th>
                                        <th className="px-8 py-6 font-normal">department</th>
                                        <th className="px-8 py-6 font-normal">initiator</th>
                                        <th className="px-8 py-6 font-normal text-right">actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {(complaints || []).filter(c => !c.is_emergency && c.status !== 'resolved' && c.status !== 'rejected').map(c => (
                                        <tr key={c.complaint_id} className="hover:bg-slate-50/30 transition-colors">
                                            <td className="px-8 py-5 text-xs text-slate-500 font-light">{c.complaint_id}</td>
                                            <td className="px-8 py-5 text-xs">
                                                <span className="text-[9px] text-slate-400 font-light lowercase">
                                                    {c.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-xs text-slate-500 font-light">{c.category}</td>
                                            <td className="px-8 py-5 text-xs text-slate-400 font-light">{c.is_anonymous ? 'anonymous' : (c.student_id?.name || 'user')}</td>
                                            <td className="px-8 py-5 text-right flex gap-3 justify-end items-center">
                                                <button onClick={() => handleAction(c.complaint_id, 'resolve')} className="text-emerald-500 text-[10px] tracking-wider font-normal hover:bg-emerald-50 px-4 py-2 rounded-xl transition-all">APPROVE</button>
                                                <button onClick={() => handleAction(c.complaint_id, 'reject')} className="text-red-400 text-[10px] tracking-wider font-normal hover:bg-red-50 px-4 py-2 rounded-xl transition-all">REJECT</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {complaints.filter(c => !c.is_emergency && c.status !== 'resolved' && c.status !== 'rejected').length === 0 && <div className="py-20 text-center text-slate-300 text-xs font-light">No active operational tickets found.</div>}
                        </div>
                    </div>
                );
            case 'history':
                return (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50 bg-slate-50/20 flex justify-between items-center">
                            <h3 className="text-xs text-slate-400 font-light uppercase tracking-widest">historical records</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                    <tr>
                                        <th className="px-8 py-6 font-normal">complaint id</th>
                                        <th className="px-8 py-6 font-normal">result</th>
                                        <th className="px-8 py-6 font-normal">category</th>
                                        <th className="px-8 py-6 font-normal">closed date</th>
                                        <th className="px-8 py-6 font-normal text-right">details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {(complaints || []).filter(c => c.status === 'resolved' || c.status === 'rejected').map(c => (
                                        <tr key={c.complaint_id} className="hover:bg-slate-50/30 transition-colors">
                                            <td className="px-8 py-5 text-xs text-slate-500 font-light">{c.complaint_id}</td>
                                            <td className="px-8 py-5 text-xs">
                                                <span className={`text-[9px] font-light lowercase ${c.status === 'resolved' ? 'text-emerald-500' : 'text-red-400'}`}>
                                                    {c.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-xs text-slate-500 font-light">{c.category}</td>
                                            <td className="px-8 py-5 text-xs text-slate-400 font-light">{new Date(c.updated_at).toLocaleDateString()}</td>
                                            <td className="px-8 py-5 text-right font-light text-[10px] text-slate-400">Archived</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'users':
                return (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50 bg-slate-50/20">
                            <h3 className="text-xs text-slate-400 font-light uppercase tracking-widest">institutional population</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                    <tr>
                                        <th className="px-8 py-6 font-normal">identity</th>
                                        <th className="px-8 py-6 font-normal">register num</th>
                                        <th className="px-8 py-6 font-normal">department</th>
                                        <th className="px-8 py-6 font-normal">verification</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {(users || []).map(u => (
                                        <tr key={u._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-5 text-xs text-slate-700 font-light">{u.name || "sys user"}</td>
                                            <td className="px-8 py-5 text-xs font-light text-slate-400">{u.register_number || u.employee_id || 'ext'}</td>
                                            <td className="px-8 py-5 text-xs font-light text-slate-500">{u.department || 'general'}</td>
                                            <td className="px-8 py-5">
                                                <span className={`text-[9px] font-light lowercase ${u.verified ? 'text-emerald-500' : 'text-slate-300'}`}>
                                                    {u.verified ? 'verified' : 'pending'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'analytics':
                 return (
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center text-center">
                            <Lucide.ShieldCheck size={48} strokeWidth={1} className="text-slate-200 mb-6" />
                            <h3 className="font-light text-slate-800 text-base mb-4 tracking-widest uppercase">Analytics Matrix</h3>
                            <p className="text-sm text-slate-400 font-light max-w-sm leading-relaxed">System logs and error data are currently being indexed for visual mapping. Real-time telemetry is active in the overview dashboard.</p>
                        </div>
                    </div>
                 );
            default:
                return null;
        }
    };

    return (
        <div className="flex min-h-screen bg-[#fafbfc] text-[#111827] font-['Inter',sans-serif] selection:bg-slate-200 overflow-x-hidden antialiased">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-50 flex flex-col fixed inset-y-0 z-50 transition-all duration-500">
                <div className="p-8 pb-10 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-2xl bg-slate-800 text-white flex items-center justify-center font-light text-sm">M</div>
                    <span className="text-[13px] tracking-[0.1em] text-slate-600 font-normal uppercase">MSAJCE TERMINAL</span>
                </div>
                
                <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar pt-4">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActivePanel(item.id)}
                            className={`w-full flex items-center justify-between px-5 py-3 rounded-2xl text-xs font-normal transition-all duration-300 ${
                                activePanel === item.id 
                                ? 'bg-slate-800 text-white shadow-xl shadow-slate-200/50' 
                                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                {item.icon && <item.icon size={16} strokeWidth={1.5} className={activePanel === item.id ? "text-white" : "text-slate-300"} />}
                                <span className={activePanel === item.id ? "font-normal" : "font-light"}>{item.label.toLowerCase()}</span>
                            </div>
                            {item.badge > 0 && (
                                <span className="bg-red-400 text-white text-[9px] px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-8 border-t border-slate-50 group">
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-light lowercase tracking-wider hover:text-emerald-500 transition-colors cursor-default">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></div>
                        system online
                    </div>
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 ml-64 flex flex-col min-h-screen relative">
                <header className="h-20 bg-white/60 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-10 sticky top-0 z-40">
                    <div className="flex flex-col">
                        <h2 className="text-[14px] text-slate-800 tracking-[0.1em] uppercase font-normal">
                            {navItems.find(i => i.id === activePanel)?.label.toLowerCase() || 'dashboard'}
                        </h2>
                        <span className="text-[9px] text-slate-300 uppercase tracking-widest font-normal">administrator terminal v4.0</span>
                    </div>

                    <div className="bg-slate-50/50 p-1 rounded-2xl flex gap-1 border border-slate-100 shadow-inner">
                        <button 
                            onClick={() => setActiveBot('assistant')}
                            className={`flex items-center gap-3 px-6 py-2 rounded-xl text-[10px] tracking-widest font-normal transition-all duration-500 ${
                                activeBot === 'assistant' ? 'bg-white text-slate-800 shadow-sm border border-slate-100' : 'text-slate-300 hover:text-slate-600'
                            }`}
                        >
                            <Lucide.Cpu size={12} strokeWidth={1.5} /> ASSISTANT
                        </button>
                        <button 
                            onClick={() => setActiveBot('grievance')}
                            className={`flex items-center gap-3 px-6 py-2 rounded-xl text-[10px] tracking-widest font-normal transition-all duration-500 ${
                                activeBot === 'grievance' ? 'bg-white text-slate-800 shadow-sm border border-slate-100' : 'text-slate-300 hover:text-slate-600'
                            }`}
                        >
                            <Lucide.Shield size={12} strokeWidth={1.5} /> GRIEVANCE
                        </button>
                    </div>

                    <div className="flex items-center gap-8">
                         <div className="flex flex-col items-end">
                            <span className="text-[10px] text-slate-400 font-light mb-0.5">{lastSync || 'syncing'}</span>
                            <div className="flex gap-1">
                                {[1, 2, 3].map(i => <div key={i} className="w-3 h-0.5 bg-slate-100 rounded-full"></div>)}
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 hover:text-slate-800 transition-all cursor-pointer">
                            <Lucide.User size={18} strokeWidth={1} />
                        </div>
                    </div>
                </header>

                <div className="p-10 max-w-7xl mx-auto w-full">
                    {renderPanelContent()}
                </div>
            </main>
        </div>
    );
};

export default App;
