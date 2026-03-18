/* VERSION 5.0.0 - MSAJCE TERMINAL DASHBOARD - VIBRANT MINIMALIST */
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import * as Lucide from 'lucide-react';

const StatCard = ({ label, value, icon: Icon, color = "blue", unit = "" }) => {
    const colors = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
        red: { bg: 'bg-rose-50', text: 'text-rose-600' },
        green: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600' }
    };
    const activeColor = colors[color] || colors.blue;

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1 h-full animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between mb-4">
               <div className={`p-2.5 ${activeColor.bg} ${activeColor.text} rounded-xl`}>
                   {Icon && <Icon size={20} strokeWidth={2} />}
               </div>
               <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
            </div>
            <div className="text-3xl text-slate-900 tracking-tight font-semibold">
                {value ?? 0}<span className="text-sm ml-1 text-slate-400 font-normal">{unit}</span>
            </div>
            <span className="text-xs text-slate-500 font-medium lowercase tracking-wide">{label}</span>
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
            { id: 'overview', label: 'Overview Dashboard', icon: Lucide.LayoutDashboard, color: 'text-blue-500' },
            { id: 'analytics', label: 'System Analytics', icon: Lucide.Activity, color: 'text-emerald-500' },
            { id: 'settings', label: 'Admin Settings', icon: Lucide.Settings, color: 'text-slate-500' },
        ];
        
        if (activeBot === 'assistant') {
            return [
                common[0], 
                { id: 'assistant', label: 'Academic Assistant', icon: Lucide.GraduationCap, color: 'text-indigo-500' },
                common[1], 
                common[2], 
            ];
        } else {
            return [
                common[0], 
                { id: 'tickets', label: 'Active Tickets', icon: Lucide.Ticket, color: 'text-amber-500' },
                { id: 'grievance', label: 'Grievance Portal', icon: Lucide.ShieldCheck, color: 'text-rose-500', badge: activeEmergencies.length },
                { id: 'users', label: 'User Registration', icon: Lucide.Users, color: 'text-cyan-500' },
                { id: 'history', label: 'Complaints History', icon: Lucide.History, color: 'text-slate-500' },
                common[1], 
                common[2], 
            ];
        }
    }, [activeBot, activeEmergencies.length]);

    if (loading && !stats) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center gap-6">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-sm text-slate-500 font-medium tracking-wide">Initializing Terminal v5.0...</p>
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
                                color="blue"
                            />
                            <StatCard 
                                label={activeBot === 'grievance' ? 'tickets active' : 'success rate'}
                                value={activeBot === 'grievance' ? stats?.complaints?.total : `${monitorData?.metrics?.assistant?.success_rate || 100}%`}
                                icon={Lucide.Activity}
                                color="green"
                            />
                            <StatCard 
                                label={activeBot === 'grievance' ? 'emergencies' : 'sys errors'}
                                value={activeBot === 'grievance' ? stats?.complaints?.emergency : monitorData?.metrics?.assistant?.total_errors}
                                icon={Lucide.AlertCircle}
                                color="red"
                            />
                            <StatCard 
                                label="resolution avg"
                                value={activeBot === 'grievance' ? stats?.complaints?.avg_resolution : (monitorData?.metrics?.assistant?.avg_latency || 0).toFixed(0)}
                                unit={activeBot === 'grievance' ? 'h' : 'ms'}
                                icon={Lucide.Clock}
                                color="amber"
                            />
                        </div>

                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col min-h-[400px]">
                            <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Lucide.Terminal size={16} className="text-blue-500" /> System Activity Stream
                            </h3>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {(monitorData.logs || []).slice(0, 50).map((log, i) => (
                                    <div key={i} className="flex gap-6 text-xs items-center p-3.5 hover:bg-slate-50 rounded-2xl transition-colors border-l-4 border-transparent hover:border-blue-500 group">
                                        <span className="text-slate-400 shrink-0 font-medium w-20">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                        <div className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-tighter ${log.bot === 'assistant' ? 'bg-blue-50 text-blue-500' : 'bg-rose-50 text-rose-500'}`}>
                                            {log.bot}
                                        </div>
                                        <span className="text-slate-700 font-medium transition-colors group-hover:text-slate-900">{log.message}</span>
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
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Lucide.AlertTriangle size={18} className="text-rose-500" /> Active Emergency Feed
                            </h3>
                            {activeEmergencies.length === 0 && <p className="text-center py-24 text-slate-400 text-sm font-medium">System reports zero active emergency alerts.</p>}
                            {activeEmergencies.map(c => (
                                <div key={c.complaint_id} className="border border-rose-100 rounded-3xl p-8 bg-rose-50/20 shadow-sm transition-all hover:shadow-md">
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className="text-sm font-bold text-rose-600 flex items-center gap-2">
                                            🚨 {c.category}
                                        </h4>
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{c.complaint_id}</span>
                                    </div>
                                    <p className="text-base font-medium text-slate-800 mb-6 leading-relaxed bg-white/50 p-6 rounded-2xl border border-rose-50 shadow-inner">{c.description}</p>
                                    <div className="flex flex-wrap gap-8 text-xs text-slate-500 mb-8 font-medium">
                                        <span className="flex items-center gap-1.5"><Lucide.MapPin size={14}/> {c.location || 'campus'}</span>
                                        <span className="flex items-center gap-1.5"><Lucide.Clock size={14}/> {new Date(c.created_at).toLocaleTimeString()}</span>
                                        <span className="flex items-center gap-1.5"><Lucide.User size={14}/> {c.is_anonymous ? 'anonymous' : (c.student_id?.name || 'student')}</span>
                                    </div>
                                    {c.evidence_urls && c.evidence_urls.length > 0 && (
                                        <div className="flex flex-wrap gap-4 mb-8">
                                            {c.evidence_urls.map((url, i) => (
                                                <a key={i} href={url} target="_blank" rel="noreferrer" className="w-24 h-24 rounded-2xl border-2 border-white shadow-md overflow-hidden hover:scale-105 transition-transform bg-slate-100 ring-1 ring-slate-100">
                                                    <img src={url} alt="Artifact" className="w-full h-full object-cover" />
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                    <button onClick={() => handleAction(c.complaint_id, 'resolve')} className="w-full bg-rose-600 text-white py-4 rounded-2xl text-xs font-bold tracking-widest hover:bg-rose-700 transition-all shadow-lg hover:shadow-rose-200">MARK AS RESOLVED</button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'tickets':
                return (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50 bg-slate-50/20 flex justify-between items-center text-slate-900">
                            <h3 className="text-sm font-bold uppercase tracking-wide">Operational Queue</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-[11px] text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                    <tr>
                                        <th className="px-8 py-6">ticket</th>
                                        <th className="px-8 py-6">status</th>
                                        <th className="px-8 py-6">category</th>
                                        <th className="px-8 py-6">initiator</th>
                                        <th className="px-8 py-6 text-right">actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {(complaints || []).filter(c => !c.is_emergency && c.status !== 'resolved' && c.status !== 'rejected').map(c => (
                                        <tr key={c.complaint_id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-5 text-sm text-blue-600 font-bold">{c.complaint_id}</td>
                                            <td className="px-8 py-5 text-xs">
                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${c.status === 'in_progress' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                                                    {c.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-sm text-slate-700 font-semibold">{c.category}</td>
                                            <td className="px-8 py-5 text-sm text-slate-500">{c.is_anonymous ? 'anonymous' : (c.student_id?.name || 'user')}</td>
                                            <td className="px-8 py-5 text-right flex gap-3 justify-end items-center">
                                                <button onClick={() => handleAction(c.complaint_id, 'resolve')} className="text-emerald-600 text-[11px] font-bold hover:bg-emerald-50 px-4 py-2 rounded-xl transition-all border border-transparent hover:border-emerald-100">APPROVE</button>
                                                <button onClick={() => handleAction(c.complaint_id, 'reject')} className="text-rose-500 text-[11px] font-bold hover:bg-rose-50 px-4 py-2 rounded-xl transition-all border border-transparent hover:border-rose-100">REJECT</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {complaints.filter(c => !c.is_emergency && c.status !== 'resolved' && c.status !== 'rejected').length === 0 && <div className="py-24 text-center text-slate-400 text-sm font-medium">No active operational tickets.</div>}
                        </div>
                    </div>
                );
            case 'history':
                return (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50 bg-slate-50/20">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Historical Archive</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-[11px] text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                    <tr>
                                        <th className="px-8 py-6">id</th>
                                        <th className="px-8 py-6">result</th>
                                        <th className="px-8 py-6">dept</th>
                                        <th className="px-8 py-6">timestamp</th>
                                        <th className="px-8 py-6 text-right">status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {(complaints || []).filter(c => c.status === 'resolved' || c.status === 'rejected').map(c => (
                                        <tr key={c.complaint_id} className="hover:bg-slate-50/30 transition-colors">
                                            <td className="px-8 py-5 text-sm text-slate-500 font-medium">{c.complaint_id}</td>
                                            <td className="px-8 py-5 text-xs">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.status === 'resolved' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                                                    {c.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-sm text-slate-600">{c.category}</td>
                                            <td className="px-8 py-5 text-xs text-slate-400">{new Date(c.updated_at).toLocaleDateString()}</td>
                                            <td className="px-8 py-5 text-right font-bold text-[11px] text-slate-300 uppercase">ARCHIVED</td>
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
                            <h3 className="text-sm font-bold text-slate-900 uppercase">User Database</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-[11px] text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                    <tr>
                                        <th className="px-8 py-6">Identity</th>
                                        <th className="px-8 py-6">ID Num</th>
                                        <th className="px-8 py-6">dept</th>
                                        <th className="px-8 py-6 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {(users || []).map(u => (
                                        <tr key={u._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-5 text-sm text-slate-900 font-bold">{u.name || "sys user"}</td>
                                            <td className="px-8 py-5 text-sm text-blue-500 font-mono">{u.register_number || u.employee_id || 'ext'}</td>
                                            <td className="px-8 py-5 text-sm text-slate-600">{u.department || 'general'}</td>
                                            <td className="px-8 py-5 text-right">
                                                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${u.verified ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
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
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 flex flex-col items-center justify-center text-center">
                            <Lucide.PieChart size={64} className="text-blue-500 opacity-20 mb-6 animate-pulse" />
                            <h3 className="font-bold text-slate-900 text-lg mb-4">Analytics Visualization Engine</h3>
                            <p className="text-sm text-slate-600 max-w-sm leading-relaxed">System logs, request overhead, and resolution metrics are being mapped to visual clusters. Real-time telemetry is accessible in the main dashboard.</p>
                        </div>
                    </div>
                 );
            default:
                return null;
        }
    };

    return (
        <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-['Inter',sans-serif] selection:bg-blue-100 overflow-x-hidden antialiased">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-100 flex flex-col fixed inset-y-0 z-50 transition-all duration-500 shadow-sm">
                <div className="p-8 pb-10 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-blue-200">M</div>
                    <span className="text-sm tracking-tighter text-slate-900 font-black uppercase">MSAJCE TERMINAL</span>
                </div>
                
                <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar pt-2">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActivePanel(item.id)}
                            className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-[13px] font-bold transition-all duration-300 ${
                                activePanel === item.id 
                                ? 'bg-blue-50 text-blue-600 shadow-sm' 
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                {item.icon && <item.icon size={18} strokeWidth={2} className={activePanel === item.id ? "text-blue-600" : "text-slate-400"} />}
                                <span>{item.label}</span>
                            </div>
                            {item.badge > 0 && (
                                <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-md shadow-md animate-pulse">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-8 border-t border-slate-50 group">
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-bold tracking-tight hover:text-emerald-500 transition-colors cursor-default">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse"></div>
                        CORE SYSTEMS ONLINE
                    </div>
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 ml-64 flex flex-col min-h-screen relative">
                <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-12 sticky top-0 z-40">
                    <div className="flex flex-col">
                        <h2 className="text-lg text-slate-900 tracking-tight font-black uppercase">
                            {navItems.find(i => i.id === activePanel)?.label || 'Dashboard'}
                        </h2>
                        <span className="text-[10px] text-blue-500 uppercase tracking-widest font-black">ADMIN ACCESS LEVEL v5.0</span>
                    </div>

                    <div className="bg-slate-100/50 p-1.5 rounded-3xl flex gap-1 border border-slate-200/50 shadow-inner">
                        <button 
                            onClick={() => setActiveBot('assistant')}
                            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-2xl text-[11px] tracking-wide font-black transition-all duration-500 ${
                                activeBot === 'assistant' ? 'bg-white text-blue-600 shadow-md border border-slate-100' : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            <Lucide.Bot size={14} strokeWidth={2} /> ASSISTANT
                        </button>
                        <button 
                            onClick={() => setActiveBot('grievance')}
                            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-2xl text-[11px] tracking-wide font-black transition-all duration-500 ${
                                activeBot === 'grievance' ? 'bg-white text-rose-600 shadow-md border border-slate-100' : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            <Lucide.ShieldCheck size={14} strokeWidth={2} /> GRIEVANCE
                        </button>
                    </div>

                    <div className="flex items-center gap-10">
                         <div className="flex flex-col items-end">
                            <span className="text-[11px] font-black text-slate-900 uppercase">SYNC: {lastSync || '00:00'}</span>
                            <div className="flex gap-1 mt-1">
                                {[1, 2, 3].map(i => <div key={i} className="w-4 h-1 bg-blue-500/20 rounded-full"></div>)}
                            </div>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm cursor-pointer">
                            <Lucide.User size={22} strokeWidth={2} />
                        </div>
                    </div>
                </header>

                <div className="p-12 max-w-[1400px] mx-auto w-full">
                    {renderPanelContent()}
                </div>
            </main>
        </div>
    );
};

export default App;
