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
    const [loading, setLoading] = useState(true);
    const [lastSync, setLastSync] = useState(null);

    const fetchAllData = async () => {
        try {
            const [compRes, statsRes, monRes] = await Promise.all([
                axios.get('/api/admin/complaints').catch(() => ({ data: [] })),
                axios.get('/api/admin/stats').catch(() => ({ data: null })),
                axios.get('/api/monitor').catch(() => ({ data: { logs: [], metrics: {} } }))
            ]);
            setComplaints(compRes.data || []);
            setStats(statsRes.data);
            setMonitorData(monRes.data || { logs: [], metrics: {} });
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

    if (loading && !stats) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-[3px] border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Initializing Terminal...</p>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-[#f9fafb] text-[#111827] font-sans selection:bg-blue-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-[#e2e8f0] flex flex-col fixed inset-y-0 z-50 shadow-sm">
                <div className="p-6 flex items-center gap-3 border-b border-[#f1f5f9]">
                    <div className="bg-[#2563eb] text-white w-8 h-8 rounded-lg flex items-center justify-center font-black text-lg">M</div>
                    <span className="font-bold text-sm tracking-tight text-[#111827] uppercase">MSAJCE Terminal</span>
                </div>
                
                <nav className="flex-1 p-4 space-y-1">
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
                        {activePanel.charAt(0).toUpperCase() + activePanel.slice(1)}
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
                    {activePanel === 'overview' && (
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
                    )}

                    {activePanel === 'grievance' && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
                                <div className="p-4 px-6 border-b border-[#f1f5f9] flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-[#111827]">Active Emergencies</h3>
                                    <span className="text-[10px] font-black text-[#ef4444] animate-pulse">LIVE</span>
                                </div>
                                <div className="p-6 space-y-4">
                                    {activeEmergencies.length === 0 && <p className="text-center py-10 text-slate-400 text-xs font-bold uppercase tracking-widest">No Active Alerts</p>}
                                    {activeEmergencies.map(c => (
                                        <div key={c.complaint_id} className="border-2 border-[#fee2e2] rounded-xl p-4 flex flex-col gap-4">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-red-700">🚨 {c.category}</h4>
                                                <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleTimeString()}</span>
                                            </div>
                                            <p className="text-sm text-slate-600">{c.description}</p>
                                            <button 
                                                onClick={() => handleAction(c.complaint_id, 'resolve')}
                                                className="bg-red-700 text-white py-2 rounded-lg font-bold text-[10px] hover:bg-red-800"
                                            >
                                                MARK RESOLVED
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;
