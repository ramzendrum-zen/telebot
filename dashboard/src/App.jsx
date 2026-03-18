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
            { id: 'overview', label: 'Overview', icon: Lucide.LayoutDashboard },
            { id: 'analytics', label: 'System Analytics', icon: Lucide.BarChart3 },
            { id: 'settings', label: 'Settings', icon: Lucide.Settings },
        ];
        
        if (activeBot === 'assistant') {
            return [
                common[0], // Overview
                { id: 'assistant', label: 'Academic Assistant', icon: Lucide.GraduationCap },
                common[1], // Analytics
                common[2], // Settings
            ];
        } else {
            return [
                common[0], // Overview
                { id: 'tickets', label: 'Operational Tickets', icon: Lucide.Ticket },
                { id: 'grievance', label: 'Grievance Portal', icon: Lucide.ShieldCheck, badge: activeEmergencies.length },
                { id: 'users', label: 'User Management', icon: Lucide.Users },
                common[1], // Analytics
                common[2], // Settings
            ];
        }
    }, [activeBot, activeEmergencies.length]);

    // Ensure activePanel exists in navItems
    useEffect(() => {
        const found = navItems.find(item => item.id === activePanel);
        if (!found) {
            setActivePanel('overview');
        }
    }, [activeBot, navItems]);

    if (loading && !stats) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-[3px] border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Initializing Terminal...</p>
            </div>
        );
    }

    const renderPanel = () => {
        switch (activePanel) {
            case 'overview':
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                            <StatCard 
                                label={activeBot === 'grievance' ? 'Total Users' : 'Total Queries'}
                                value={activeBot === 'grievance' ? stats?.users?.total : monitorData?.metrics?.assistant?.total_requests}
                                icon={Lucide.Users}
                                trend="System Base"
                                color="blue"
                            />
                            <StatCard 
                                label={activeBot === 'grievance' ? 'Tickets' : 'Success Rate'}
                                value={activeBot === 'grievance' ? stats?.complaints?.total : `${monitorData?.metrics?.assistant?.success_rate || 100}%`}
                                icon={Lucide.Activity}
                                trend="Live Session"
                                color="blue"
                            />
                            <StatCard 
                                label={activeBot === 'grievance' ? 'Emergencies' : 'Errors'}
                                value={activeBot === 'grievance' ? stats?.complaints?.emergency : monitorData?.metrics?.assistant?.total_errors}
                                icon={Lucide.AlertTriangle}
                                trend="Review Needed"
                                color="red"
                            />
                            <StatCard 
                                label={activeBot === 'grievance' ? 'Res. Time' : 'Avg Latency'}
                                value={activeBot === 'grievance' ? stats?.complaints?.avg_resolution : (monitorData?.metrics?.assistant?.avg_latency || 0).toFixed(0)}
                                unit={activeBot === 'grievance' ? 'h' : 'ms'}
                                icon={Lucide.CheckCircle}
                                trend="Target Net"
                                color="green"
                            />
                        </div>
                    </div>
                );
            case 'grievance':
                return (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
                            <div className="p-4 px-6 border-b border-[#f1f5f9] flex justify-between items-center">
                                <h3 className="text-sm font-bold text-[#111827]">Active Emergencies</h3>
                                <span className="text-[10px] font-black text-[#ef4444] animate-pulse">LIVE UPDATING</span>
                            </div>
                            <div className="p-6 space-y-6">
                                {activeEmergencies.length === 0 && <p className="text-center py-10 text-slate-400 text-xs font-bold uppercase tracking-widest">No Active Alerts</p>}
                                {activeEmergencies.map(c => (
                                    <div key={c.complaint_id} className="border-2 border-[#fee2e2] rounded-xl overflow-hidden shadow-sm">
                                        <div className="p-5 border-l-4 border-[#ef4444] space-y-4">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-red-700 flex items-center gap-2">🚨 {c.category}</h4>
                                                <span className="text-[10px] text-slate-400 font-bold">{new Date(c.created_at).toLocaleString()}</span>
                                            </div>
                                            <p className="text-sm font-medium text-slate-700 bg-red-50/50 p-3 rounded-lg border border-red-100">{c.description}</p>
                                            
                                            <div className="flex gap-6 text-[11px] text-slate-500 font-semibold">
                                                <div><span className="text-slate-400 uppercase mr-1">Origin:</span> {c.location || 'Unknown'}</div>
                                                <div><span className="text-slate-400 uppercase mr-1">User:</span> {c.is_anonymous ? 'Anonymous' : (c.student_id?.name || 'User')}</div>
                                            </div>

                                            {c.evidence_urls && c.evidence_urls.length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-2">
                                                    {c.evidence_urls.map((url, i) => (
                                                        <a key={i} href={url} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden hover:border-red-500 transition-colors">
                                                            <img src={url} alt="Artifact" className="w-full h-full object-cover" />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}

                                            <button 
                                                onClick={() => handleAction(c.complaint_id, 'resolve')}
                                                className="w-full bg-red-700 text-white py-2.5 rounded-lg font-bold text-[11px] uppercase tracking-widest hover:bg-red-800 transition-colors shadow-sm"
                                            >
                                                MARK RESOLVED
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 'tickets':
                return (
                    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
                         <div className="p-4 px-6 border-b border-[#f1f5f9] flex justify-between items-center bg-slate-50">
                            <h3 className="text-sm font-bold text-[#111827]">Operational Tickets Queue</h3>
                         </div>
                         <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white text-[11px] font-bold text-[#6b7280] uppercase tracking-widest border-b border-[#e2e8f0]">
                                    <tr>
                                        <th className="px-6 py-4">ID</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Category</th>
                                        <th className="px-6 py-4">Initiator</th>
                                        <th className="px-6 py-4">Artifacts</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f1f5f9]">
                                    {(complaints || []).filter(c => !c.is_emergency && c.status !== 'resolved').map(c => (
                                        <tr key={c.complaint_id} className="hover:bg-[#fcfdfe] transition-colors">
                                            <td className="px-6 py-4 font-bold text-[#2563eb]">{c.complaint_id}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${
                                                    c.status === 'in_progress' ? 'bg-[#fffbeb] text-[#b45309] border border-[#fde68a]' : 'bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]'
                                                }`}>
                                                    {c.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-semibold">{c.category}</td>
                                            <td className="px-6 py-4 text-xs font-medium text-slate-500">{c.is_anonymous ? 'Anonymous' : (c.student_id?.name || 'User')}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex -space-x-2">
                                                    {(c.evidence_urls || []).slice(0, 3).map((u, i) => (
                                                        <div key={i} className="w-6 h-6 rounded-md border-2 border-white bg-slate-200 overflow-hidden">
                                                            <img src={u} className="w-full h-full object-cover" alt="" />
                                                        </div>
                                                    ))}
                                                    {(c.evidence_urls?.length > 3) && <div className="w-6 h-6 rounded-md border-2 border-white bg-slate-800 text-[8px] flex items-center justify-center text-white">+{c.evidence_urls.length - 3}</div>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => handleAction(c.complaint_id, 'resolve')} className="bg-[#2563eb] text-white px-3 py-1.5 rounded-lg font-bold text-[10px] hover:bg-blue-700 transition-all">RESOLVE</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                         </div>
                    </div>
                );
            case 'users':
                return (
                    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
                         <div className="p-4 px-6 border-b border-[#f1f5f9] bg-slate-50">
                            <h3 className="text-sm font-bold text-[#111827]">Institutional User Management</h3>
                         </div>
                         <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-[11px] font-bold text-[#6b7280] uppercase tracking-widest border-b border-[#e2e8f0]">
                                    <tr>
                                        <th className="px-6 py-4">Name</th>
                                        <th className="px-6 py-4">ID / Register</th>
                                        <th className="px-6 py-4">Department</th>
                                        <th className="px-6 py-4">Contact</th>
                                        <th className="px-6 py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f1f5f9]">
                                    {(users || []).map(u => (
                                        <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-800">{u.name || u.telegram_first_name}</td>
                                            <td className="px-6 py-4 text-xs font-mono text-slate-500">{u.register_number || u.employee_id || 'N/A'}</td>
                                            <td className="px-6 py-4 text-sm">{u.department || 'General'}</td>
                                            <td className="px-6 py-4 text-[11px] font-semibold">{u.phoneNumber || 'No Data'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[9px] font-black ${u.verified ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
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
                        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
                            <div className="p-4 px-6 border-b border-[#f1f5f9] flex justify-between items-center bg-slate-50">
                                <h3 className="text-sm font-bold text-[#111827]">Live System Logs</h3>
                                <div className="p-1.5 bg-[#10b981] rounded-full animate-pulse"></div>
                            </div>
                            <div className="p-4 space-y-2 font-mono text-[11px] max-h-[500px] overflow-y-auto">
                                {monitorData.logs.map((log, i) => (
                                    <div key={i} className="flex gap-4 p-2.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                                        <span className="text-slate-400 font-bold shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                        <span className={`font-black uppercase tracking-tighter ${log.bot === 'assistant' ? 'text-blue-500' : 'text-amber-500'}`}>{log.bot}</span>
                                        <span className="text-slate-700 font-medium">{log.message}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Page Module Under Development</p>
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
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                activePanel === item.id 
                                ? 'bg-[#f0f7ff] text-[#2563eb] font-semibold' 
                                : 'text-[#6b7280] hover:bg-[#f0f7ff] hover:text-[#2563eb]'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                {item.icon && <item.icon size={18} className={activePanel === item.id ? "text-blue-600" : "text-slate-400"} />}
                                {item.label}
                            </div>
                            {item.badge > 0 && (
                                <span className="bg-[#ef4444] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-[#e2e8f0] pb-6">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-[#10b981] uppercase tracking-widest">
                        <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]"></div>
                        Oracle Online
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 flex flex-col min-h-screen relative">
                <header className="h-16 bg-white border-b border-[#e2e8f0] px-8 flex items-center justify-between sticky top-0 z-40">
                    <h2 className="font-bold text-[#111827] text-lg tracking-tight">
                        {navItems.find(i => i.id === activePanel)?.label || 'Terminal Dashboard'}
                    </h2>

                    <div className="bg-[#f1f5f9] p-1 rounded-full flex gap-1 border border-[#e2e8f0]">
                        <button 
                            onClick={() => setActiveBot('assistant')}
                            className={`flex items-center gap-2 px-6 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                                activeBot === 'assistant' ? 'bg-[#2563eb] text-white shadow-md' : 'text-[#6b7280] hover:text-[#2563eb]'
                            }`}
                        >
                            <Lucide.Bot size={14} /> ASSISTANT
                        </button>
                        <button 
                            onClick={() => setActiveBot('grievance')}
                            className={`flex items-center gap-2 px-6 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                                activeBot === 'grievance' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-[#6b7280] hover:text-[#2563eb]'
                            }`}
                        >
                            <Lucide.ShieldCheck size={14} /> GRIEVANCE
                        </button>
                    </div>

                    <div className="flex items-center gap-4 text-[#6b7280]">
                        <span className="text-[11px] font-bold uppercase tracking-widest border-r border-[#e2e8f0] pr-4">
                            {lastSync || 'SYNCING...'}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-[#e2e8f0] flex items-center justify-center text-[#64748b]">
                            <Lucide.User size={14} />
                        </div>
                    </div>
                </header>

                <div className="p-8">
                    {renderPanel()}
                </div>
            </main>
        </div>
    );
};

export default App;
