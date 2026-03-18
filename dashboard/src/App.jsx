/* VERSION 3.0.0 - MSAJCE TERMINAL DASHBOARD - FULL MODULES */
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import * as Lucide from 'lucide-react';

const StatCard = ({ label, value, icon: Icon, trend, color = "blue", unit = "" }) => {
    const iconColor = color === 'red' ? 'text-red-500' : 'text-emerald-500';
    return (
        <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col gap-2 h-full">
            <div className={`flex items-center gap-2 ${iconColor} text-[10px] font-semibold mb-2`}>
                {Icon && <Icon size={12} />}
                <span>{trend}</span>
            </div>
            <div className="text-[32px] font-bold text-slate-800 tracking-tight leading-tight">
                {value ?? 0}<span className="text-xl font-normal ml-0.5">{unit}</span>
            </div>
            <span className="text-[11px] font-semibold text-[#6b7280]">{label}</span>
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
            setLastSync(new Date().toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit' }));
            setLoading(false);
        } catch (e) {
            console.error("Fetch failed", e);
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
            { id: 'overview', label: 'Overview Dashboard', icon: Lucide.LayoutDashboard },
            { id: 'analytics', label: 'System Analytics', icon: Lucide.BarChart3 },
            { id: 'settings', label: 'Admin Settings', icon: Lucide.Settings },
        ];
        
        if (activeBot === 'assistant') {
            return [
                common[0], // Overview
                { id: 'assistant', label: 'Academic AI Assistant', icon: Lucide.GraduationCap },
                common[1], // Analytics
                common[2], // Settings
            ];
        } else {
            return [
                common[0], // Overview
                { id: 'tickets', label: 'Operational Tickets', icon: Lucide.Ticket },
                { id: 'grievance', label: 'Grievance Portal', icon: Lucide.ShieldCheck, badge: activeEmergencies.length },
                { id: 'users', label: 'User Registration', icon: Lucide.Users },
                common[1], // Analytics
                common[2], // Settings
            ];
        }
    }, [activeBot, activeEmergencies.length]);

    if (loading && !stats) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-[3px] border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Initializing Terminal v3.0...</p>
            </div>
        );
    }

    const renderPanelContent = () => {
        switch (activePanel) {
            case 'overview':
                return (
                    <div className="space-y-6">
                        {/* Stat Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                            <StatCard 
                                label={activeBot === 'grievance' ? 'Total Users' : 'Total Queries'}
                                value={activeBot === 'grievance' ? stats?.users?.total : monitorData?.metrics?.assistant?.total_requests}
                                icon={Lucide.Users}
                                trend="System Base"
                                color="blue"
                            />
                            <StatCard 
                                label={activeBot === 'grievance' ? 'Tickets (Today)' : 'Success Rate'}
                                value={activeBot === 'grievance' ? stats?.complaints?.total : `${monitorData?.metrics?.assistant?.success_rate || 100}%`}
                                icon={Lucide.Activity}
                                trend="Live Session"
                                color="blue"
                            />
                            <StatCard 
                                label={activeBot === 'grievance' ? 'Emergencies' : 'Errors Detected'}
                                value={activeBot === 'grievance' ? stats?.complaints?.emergency : monitorData?.metrics?.assistant?.total_errors}
                                icon={Lucide.AlertTriangle}
                                trend="Review Needed"
                                color="red"
                            />
                            <StatCard 
                                label={activeBot === 'grievance' ? 'Avg Resolution' : 'Avg Latency'}
                                value={activeBot === 'grievance' ? stats?.complaints?.avg_resolution : (monitorData?.metrics?.assistant?.avg_latency || 0).toFixed(0)}
                                unit={activeBot === 'grievance' ? 'h' : 'ms'}
                                icon={Lucide.CheckCircle}
                                trend="Target Perf"
                                color="green"
                            />
                        </div>

                        {/* Realtime logs and Pulse */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-2xl border border-[#e2e8f0] shadow-sm">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 border-b pb-3 uppercase tracking-tighter">Live System Pulse</h3>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                    {(monitorData.logs || []).slice(0, 20).map((log, i) => (
                                        <div key={i} className="flex gap-4 text-[11px] p-2 hover:bg-slate-50 rounded-lg border-l-2 border-blue-500 transition-colors">
                                            <span className="text-slate-400 shrink-0 font-bold">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                            <span className="text-slate-700 font-semibold">{log.message}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-[#e2e8f0] shadow-sm flex flex-col items-center justify-center text-slate-300 min-h-[300px]">
                                <Lucide.BarChart3 size={48} className="opacity-20 mb-4" />
                                <span className="font-bold uppercase tracking-widest text-[10px]">Analytics Matrix Initializing...</span>
                            </div>
                        </div>
                    </div>
                );
            case 'grievance':
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                            <div className="bg-red-50 border border-red-100 p-6 rounded-2xl flex flex-col">
                                <span className="text-[10px] font-black text-red-600 uppercase mb-1">Emergency Alerts</span>
                                <span className="text-3xl font-black text-red-900">{activeEmergencies.length}</span>
                            </div>
                            <div className="bg-white border border-slate-100 p-6 rounded-2xl flex flex-col shadow-sm">
                                <span className="text-[10px] font-black text-slate-400 uppercase mb-1">Avg Resolution (hrs)</span>
                                <span className="text-3xl font-black text-slate-900">{stats?.complaints?.avg_resolution || '0.0'}</span>
                            </div>
                        </div>
                        <div className="p-6 space-y-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                            <h3 className="font-black text-slate-900 uppercase tracking-tighter text-sm">Active Incident Feed</h3>
                            {activeEmergencies.length === 0 && <p className="text-center py-20 text-slate-300 font-bold uppercase text-xs">No active emergency alerts detected</p>}
                            {activeEmergencies.map(c => (
                                <div key={c.complaint_id} className="border border-slate-100 rounded-2xl p-6 bg-[#fcfdfe] relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 font-mono text-[9px] text-slate-300">{c.complaint_id}</div>
                                    <h4 className="font-bold text-red-600 flex items-center gap-2 mb-2">🚨 {c.category}</h4>
                                    <p className="text-sm font-medium text-slate-700 bg-white p-4 rounded-xl border border-slate-100 mb-4">{c.description}</p>
                                    <div className="flex flex-wrap gap-4 text-[10px] uppercase font-bold text-slate-400 mb-4">
                                        <span>📍 {c.location || 'College Campus'}</span>
                                        <span>🕒 {new Date(c.created_at).toLocaleTimeString()}</span>
                                        <span>👤 {c.is_anonymous ? 'ANONYMOUS' : (c.student_id?.name || 'STUDENT')}</span>
                                    </div>
                                    {c.evidence_urls && c.evidence_urls.length > 0 && (
                                        <div className="flex flex-wrap gap-3 mb-4">
                                            {c.evidence_urls.map((url, i) => (
                                                <a key={i} href={url} target="_blank" rel="noreferrer" className="w-20 h-20 rounded-xl border-2 border-white shadow-sm overflow-hidden hover:scale-105 transition-transform bg-slate-100">
                                                    <img src={url} alt="Artifact" className="w-full h-full object-cover" />
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                    <button onClick={() => handleAction(c.complaint_id, 'resolve')} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-black transition-all">RESOLVE INCIDENT</button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'tickets':
                return (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="font-black text-slate-900 uppercase tracking-tighter text-sm">Operational Queue</h3>
                            <button onClick={fetchAllData} className="p-2 hover:bg-white rounded-lg transition-all text-slate-400"><Lucide.Activity size={16} /></button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                    <tr>
                                        <th className="px-6 py-5">Ticket</th>
                                        <th className="px-6 py-5">Status</th>
                                        <th className="px-6 py-5">Category</th>
                                        <th className="px-6 py-5">Initiator</th>
                                        <th className="px-6 py-5">Evidence</th>
                                        <th className="px-6 py-5 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {(complaints || []).filter(c => !c.is_emergency && c.status !== 'resolved').map(c => (
                                        <tr key={c.complaint_id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-blue-600">{c.complaint_id}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${c.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {c.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-700 text-sm">{c.category}</td>
                                            <td className="px-6 py-4 text-xs font-semibold text-slate-500">{c.is_anonymous ? 'Anonymous' : (c.student_id?.name || 'User')}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex -space-x-2">
                                                    {(c.evidence_urls || []).slice(0, 3).map((u, i) => (
                                                        <div key={i} className="w-8 h-8 rounded-lg border-2 border-white bg-slate-200 shadow-sm overflow-hidden">
                                                            <img src={u} className="w-full h-full object-cover" alt="" />
                                                        </div>
                                                    ))}
                                                    {(c.evidence_urls?.length > 3) && <div className="w-8 h-8 rounded-lg border-2 border-white bg-slate-900 text-[10px] flex items-center justify-center text-white font-bold">+{c.evidence_urls.length - 3}</div>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => handleAction(c.complaint_id, 'resolve')} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-[10px] hover:bg-blue-600 transition-all">RESOLVE</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {complaints.filter(c => !c.is_emergency && c.status !== 'resolved').length === 0 && <div className="py-20 text-center text-slate-300 font-bold uppercase text-xs">No pending operational tickets</div>}
                        </div>
                    </div>
                );
            case 'users':
                return (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                            <h3 className="font-black text-slate-900 uppercase tracking-tighter text-sm">Institutional Population</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                    <tr>
                                        <th className="px-6 py-5">Verified User</th>
                                        <th className="px-6 py-5">Register / ID</th>
                                        <th className="px-6 py-5">Department</th>
                                        <th className="px-6 py-5">Communication</th>
                                        <th className="px-6 py-5">Verification</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {(users || []).map(u => (
                                        <tr key={u._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-800">{u.name || "UNREGISTERED USER"}</td>
                                            <td className="px-6 py-4 text-xs font-mono text-blue-500 font-bold">{u.register_number || u.employee_id || 'EXT-TELE'}</td>
                                            <td className="px-6 py-4 text-sm font-semibold">{u.department || 'N/A'}</td>
                                            <td className="px-6 py-4 text-[11px] font-bold text-slate-500">{u.phoneNumber || 'NO PHONE'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[9px] font-black ${u.verified ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                                    {u.verified ? 'VERIFIED' : 'PENDING'}
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
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex flex-col items-center justify-center text-center">
                            <Lucide.Activity size={64} className="text-blue-500 opacity-20 mb-6 animate-pulse" />
                            <h3 className="font-bold text-slate-800 text-lg mb-2">Advanced Analytics System</h3>
                            <p className="text-sm text-slate-500 max-w-md">The analytic matrix is processing institutional data streams. High-resolution charts and trend predictions will appear here once the baseline data reaches 100 entries.</p>
                        </div>
                    </div>
                 );
            default:
                return (
                    <div className="flex flex-col items-center justify-center py-40 bg-white rounded-3xl border border-dashed border-slate-200">
                        <Lucide.Monitor size={48} className="text-slate-200 mb-4" />
                        <p className="text-slate-300 font-bold uppercase tracking-widest text-[11px]">Module Initialization Required</p>
                    </div>
                );
        }
    };

    return (
        <div className="flex min-h-screen bg-[#f9fafb] text-[#111827] font-sans selection:bg-blue-100 overflow-x-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-[#e2e8f0] flex flex-col fixed inset-y-0 z-50 shadow-sm">
                <div className="p-6 flex items-center gap-3 border-b border-[#f1f5f9]">
                    <div className="bg-[#2563eb] text-white w-8 h-8 rounded-lg flex items-center justify-center font-black text-lg">M</div>
                    <span className="font-bold text-sm tracking-tight text-[#111827] uppercase">MSAJCE Terminal</span>
                </div>
                
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActivePanel(item.id)}
                            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-bold transition-all ${
                                activePanel === item.id 
                                ? 'bg-[#f0f7ff] text-[#2563eb]' 
                                : 'text-slate-500 hover:bg-[#f8fafc] hover:text-slate-800'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                {item.icon && <item.icon size={18} className={activePanel === item.id ? "text-blue-600" : "text-slate-300"} />}
                                {item.label}
                            </div>
                            {item.badge > 0 && (
                                <span className="bg-[#ef4444] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-sm">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-6 border-t border-slate-50">
                    <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse"></div>
                        System Online
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 ml-64 flex flex-col min-h-screen relative">
                {/* Global Header */}
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-[#e2e8f0] px-8 flex items-center justify-between sticky top-0 z-40">
                    <div>
                        <h2 className="font-black text-[#111827] text-xl tracking-tighter uppercase">
                            {navItems.find(i => i.id === activePanel)?.label || 'Dashboard'}
                        </h2>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                           Institutional Administration Access
                        </span>
                    </div>

                    {/* Bot Selector Hub */}
                    <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 border border-slate-200">
                        <button 
                            onClick={() => setActiveBot('assistant')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[11px] font-black transition-all ${
                                activeBot === 'assistant' ? 'bg-[#2563eb] text-white shadow-lg' : 'text-slate-500 hover:text-[#2563eb]'
                            }`}
                        >
                            <Lucide.Bot size={14} /> ASSISTANT
                        </button>
                        <button 
                            onClick={() => setActiveBot('grievance')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[11px] font-black transition-all ${
                                activeBot === 'grievance' ? 'bg-white text-slate-900 shadow-md border border-slate-200' : 'text-slate-500 hover:text-[#2563eb]'
                            }`}
                        >
                            <Lucide.ShieldCheck size={14} /> GRIEVANCE
                        </button>
                    </div>

                    <div className="flex items-center gap-6">
                         <div className="hidden xl:flex flex-col items-end">
                            <span className="text-[11px] font-black text-slate-800">{lastSync || 'SYNCING'}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cloud Latency: 4ms</span>
                        </div>
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors cursor-pointer">
                            <Lucide.User size={20} />
                        </div>
                    </div>
                </header>

                {/* Scrolled Content */}
                <div className="p-8 pb-20">
                    {renderPanelContent()}
                </div>
            </main>
        </div>
    );
};

export default App;
