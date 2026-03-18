import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
    LayoutDashboard, 
    Ticket, 
    ShieldCheck, 
    History, 
    Users, 
    BarChart3, 
    Settings, 
    Bot, 
    AlertTriangle, 
    CheckCircle, 
    ArrowRight, 
    Activity,
    MessageSquare,
    Clock,
    User,
    ArrowUpRight,
    Search,
    ChevronRight,
    GraduationCap
} from 'lucide-react';

const App = () => {
    const [activeBot, setActiveBot] = useState('assistant');
    const [activePanel, setActivePanel] = useState('overview');
    const [complaints, setComplaints] = useState([]);
    const [stats, setStats] = useState(null);
    const [monitorData, setMonitorData] = useState({ logs: [], metrics: { assistant: {}, grievance: {} } });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastSync, setLastSync] = useState(null);

    useEffect(() => {
        fetchAllData();
        const interval = setInterval(fetchAllData, 15000);
        return () => clearInterval(interval);
    }, []);

    const fetchAllData = async () => {
        try {
            const [compRes, statsRes, monRes, usersRes] = await Promise.all([
                axios.get('/api/admin/complaints'),
                axios.get('/api/admin/stats'),
                axios.get('/api/monitor'),
                axios.get('/api/admin/users')
            ]);
            setComplaints(compRes.data);
            setStats(statsRes.data);
            setMonitorData(monRes.data);
            setUsers(usersRes.data);
            setLastSync(new Date().toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit' }));
            setLoading(false);
        } catch (e) {
            console.error("Fetch failed", e);
            setLoading(false);
        }
    };

    const handleAction = async (id, action) => {
        try {
            await axios.post(`/api/admin/complaints/${id}/action`, { action });
            fetchAllData();
        } catch (e) { console.error(e); }
    };

    const activeEmergencies = useMemo(() => constraints(complaints).filter(c => c.is_emergency && c.status !== 'resolved' && c.status !== 'rejected'), [complaints]);
    
    function constraints(arr) { return arr || []; }

    const navItems = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'tickets', label: 'Operational Tickets', icon: Ticket },
        { id: 'assistant', label: 'Academic Assistant', icon: GraduationCap },
        { id: 'grievance', label: 'Grievance Portal', icon: ShieldCheck, badge: activeEmergencies.length },
        { id: 'users', label: 'User Management', icon: Users },
        { id: 'analytics', label: 'System Analytics', icon: BarChart3 },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    if (loading && !stats) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-[3px] border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Initializing MSAJCE Terminal...</p>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-[#f9fafb] text-[#111827] font-['Inter',sans-serif] selection:bg-blue-100">
            {/* Sidebar - Matches Screenshot 2 exactly */}
            <aside className="w-64 bg-white border-r border-[#e2e8f0] flex flex-col fixed inset-y-0 z-50">
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
                                ? 'bg-[#f0f7ff] text-[#2563eb]' 
                                : 'text-[#6b7280] hover:bg-[#f0f7ff] hover:text-[#2563eb]'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon size={18} />
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

            {/* Main Area */}
            <main className="flex-1 ml-64 flex flex-col min-h-screen">
                {/* Header - Matches Screenshot 2 exactly */}
                <header className="h-16 bg-white border-b border-[#e2e8f0] px-8 flex items-center justify-between sticky top-0 z-40">
                    <h2 className="font-bold text-[#111827] text-lg tracking-tight">
                        {activePanel === 'overview' ? 'Overview Dashboard' : (activePanel.charAt(0).toUpperCase() + activePanel.slice(1).replace('_', ' '))}
                    </h2>

                    {/* Bot Switcher Panel */}
                    <div className="bg-[#f1f5f9] p-1 rounded-xl flex gap-1 border border-[#e2e8f0]">
                        <button 
                            onClick={() => setActiveBot('assistant')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                                activeBot === 'assistant' 
                                ? 'bg-[#2563eb] text-white shadow-md' 
                                : 'text-[#6b7280] hover:text-[#2563eb]'
                            }`}
                        >
                            <Bot size={14} /> ASSISTANT
                        </button>
                        <button 
                            onClick={() => setActiveBot('grievance')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                                activeBot === 'grievance' 
                                ? 'bg-[#2563eb] text-white shadow-md' 
                                : 'text-[#6b7280] hover:text-[#2563eb]'
                            }`}
                        >
                            <ShieldCheck size={14} /> GRIEVANCE
                        </button>
                    </div>

                    <div className="flex items-center gap-4 text-[#6b7280]">
                        <span className="text-[11px] font-bold uppercase tracking-widest border-r border-[#e2e8f0] pr-4" id="lastSync">
                            {lastSync ? `Synced ${lastSync}` : 'Syncing...'}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-[#e2e8f0] flex items-center justify-center text-[#64748b] font-bold text-xs">
                            A
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="p-8">
                    {activePanel === 'overview' && (
                        <div className="space-y-6">
                            {/* Stat Cards Area - Matches Screenshot 2 exactly */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                <StatCard 
                                    label={activeBot === 'grievance' ? 'Total Users' : 'Total Queries'}
                                    value={activeBot === 'grievance' ? stats?.users?.total : monitorData?.metrics?.assistant?.total_requests || 0}
                                    icon={Users}
                                    trend="Institutional Base"
                                    color="blue"
                                />
                                <StatCard 
                                    label={activeBot === 'grievance' ? 'Tickets (Today)' : 'Success Rate'}
                                    value={activeBot === 'grievance' ? stats?.complaints?.total || 0 : `${monitorData?.metrics?.assistant?.success_rate || 100}%`}
                                    icon={Activity}
                                    trend="Active Session"
                                    color="blue"
                                />
                                <StatCard 
                                    label={activeBot === 'grievance' ? 'Emergencies' : 'System Errors'}
                                    value={activeBot === 'grievance' ? stats?.complaints?.emergency || 0 : monitorData?.metrics?.assistant?.total_errors || 0}
                                    icon={AlertTriangle}
                                    trend="Needs Review"
                                    color="red"
                                />
                                <StatCard 
                                    label={activeBot === 'grievance' ? 'Resolution Time' : 'Avg Latency'}
                                    value={activeBot === 'grievance' ? stats?.complaints?.avg_resolution || '0.0' : (monitorData?.metrics?.assistant?.avg_latency || 0).toFixed(0)}
                                    unit={activeBot === 'grievance' ? 'h' : 'ms'}
                                    icon={CheckCircle}
                                    trend={activeBot === 'grievance' ? 'Target: < 12h' : 'Network Speed'}
                                    color="green"
                                />
                            </div>

                            {/* Middle Section - Chart and Pulse */}
                            <div className="grid lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-[#e2e8f0] shadow-sm">
                                    <h3 className="text-sm font-bold border-b border-[#f1f5f9] pb-4 mb-4 text-[#111827]">Complaint Distribution (by Category)</h3>
                                    <div className="flex items-center justify-center py-10">
                                        <div className="w-48 h-48 rounded-full border-[20px] border-slate-100 flex items-center justify-center text-slate-300 font-black">
                                            CHART
                                        </div>
                                    </div>
                                </div>
                                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-[#e2e8f0] shadow-sm">
                                    <h3 className="text-sm font-bold border-b border-[#f1f5f9] pb-4 mb-4 text-[#111827]">System Pulse (Live Activity)</h3>
                                    <div className="space-y-4 max-h-[300px] overflow-y-auto">
                                        {monitorData.logs.slice(0, 10).map((log, i) => (
                                            <div key={i} className="flex gap-4 items-start py-2 border-b border-[#f8fafc] last:border-0">
                                                <span className="text-[11px] font-mono text-[#6b7280] min-w-[50px]">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
                                                <p className="text-xs font-semibold text-[#111827]">{log.message}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activePanel === 'grievance' && (
                        <div className="space-y-6">
                            {/* Stats Bar Container - Matches Screenshot 3 exactly */}
                            <div className="flex gap-6 mb-8">
                                <div className="bg-white border-2 border-[#fee2e2] p-6 rounded-2xl flex-1 flex flex-col gap-1">
                                    <span className="text-[10px] font-black text-[#ef4444] uppercase tracking-widest">Emergency Alerts Active</span>
                                    <div className="text-3xl font-black text-[#111827]">{activeEmergencies.length}</div>
                                </div>
                                <div className="bg-white border border-[#e2e8f0] p-6 rounded-2xl flex-1 flex flex-col gap-1">
                                     <span className="text-[10px] font-black text-[#6b7280] uppercase tracking-widest">Avg Resolution Time</span>
                                     <div className="text-3xl font-black text-[#111827]">{stats?.complaints?.avg_resolution || '0.0'} <span className="text-sm text-slate-400">hrs</span></div>
                                </div>
                            </div>

                            {/* Incident Area */}
                            <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
                                <div className="p-4 px-6 border-b border-[#f1f5f9] flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-[#111827]">Active Emergency Incidents</h3>
                                    <span className="text-[10px] font-black text-[#ef4444] uppercase tracking-tighter flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div> Live Updating
                                    </span>
                                </div>
                                <div className="p-6 space-y-6">
                                    {activeEmergencies.length === 0 && (
                                        <p className="text-center py-10 text-slate-400 font-bold uppercase text-xs">No Active Alerts</p>
                                    )}
                                    {activeEmergencies.map(c => (
                                        <div key={c.complaint_id} className="border-2 border-[#fee2e2] rounded-2xl overflow-hidden relative">
                                            <div className="bg-[#fff1f2] border-l-4 border-red-500 p-4 flex justify-between items-start">
                                                <div className="flex flex-col gap-1">
                                                    <h4 className="font-black text-slate-900 flex items-center gap-2">
                                                        🚨 {c.category}
                                                    </h4>
                                                    <div className="flex gap-4 mt-2 mb-2">
                                                        <div className="flex flex-col text-[10px] leading-tight">
                                                            <span className="text-[#94a3b8] font-bold uppercase">Location:</span>
                                                            <span className="text-[#334155] font-semibold">{c.location || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex flex-col text-[10px] leading-tight">
                                                            <span className="text-[#94a3b8] font-bold uppercase">Time:</span>
                                                            <span className="text-[#334155] font-semibold">{new Date(c.created_at).toLocaleTimeString().toLowerCase()}</span>
                                                        </div>
                                                        <div className="flex flex-col text-[10px] leading-tight">
                                                            <span className="text-[#94a3b8] font-bold uppercase">Reported By:</span>
                                                            <span className="text-[#334155] font-semibold">{c.is_anonymous ? 'Anonymous' : (c.student_id?.name || 'User')}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-4 bg-white flex flex-col gap-4 border-t border-[#fee2e2]">
                                                <button 
                                                    onClick={() => handleAction(c.complaint_id, 'resolve')}
                                                    className="w-full bg-[#991b1b] text-white py-2.5 rounded-lg font-bold text-[11px] uppercase tracking-widest hover:bg-red-800 transition-colors"
                                                >
                                                    Mark Resolved
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activePanel === 'tickets' && (
                        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
                             <div className="p-4 px-6 border-b border-[#f1f5f9] flex justify-between items-center">
                                <h3 className="text-sm font-bold text-[#111827]">Live Operational Tickets (Pending)</h3>
                             </div>
                             <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-[#f8fafc] text-[11px] font-bold text-[#6b7280] uppercase tracking-widest border-b border-[#e2e8f0]">
                                        <tr>
                                            <th className="px-6 py-4">Ticket ID</th>
                                            <th className="px-6 py-4">Category</th>
                                            <th className="px-6 py-4">Initiator</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#f1f5f9]">
                                        {constraints(complaints).filter(c => c.status !== 'resolved' && c.status !== 'rejected' && !c.is_emergency).map(c => (
                                            <tr key={c.complaint_id} className="hover:bg-[#fcfdfe]">
                                                <td className="px-6 py-4 font-bold text-[#2563eb]">{c.complaint_id}</td>
                                                <td className="px-6 py-4 font-semibold text-slate-700">{c.category}</td>
                                                <td className="px-6 py-4 text-sm font-medium">{c.is_anonymous ? 'Anonymous' : (c.student_id?.name || 'User')}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                                                        c.status === 'in_progress' ? 'bg-[#fffbeb] text-[#b45309]' : 'bg-[#eff6ff] text-[#2563eb]'
                                                    }`}>
                                                        {c.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right flex gap-2 justify-end">
                                                    <button onClick={() => handleAction(c.complaint_id, 'resolve')} className="bg-[#2563eb] text-white px-3 py-1 rounded-md font-bold text-[11px]">RESOLVE</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

const StatCard = ({ label, value, icon: Icon, trend, color = "blue", unit = "" }) => {
    return (
        <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col gap-2 h-full">
            <span className="text-[11px] font-bold text-[#6b7280] uppercase tracking-widest">{label}</span>
            <div className="text-[32px] font-black tracking-tight leading-tight">
                {value}<span className="text-sm text-slate-400 font-bold ml-1">{unit}</span>
            </div>
            <div className={`flex items-center gap-2 mt-auto pt-4 text-[12px] font-semibold ${
                color === 'red' ? 'text-[#ef4444]' : (color === 'green' ? 'text-[#10b981]' : (color === 'amber' ? 'text-[#f59e0b]' : 'text-[#2563eb]'))
            }`}>
                <Icon size={14} />
                {trend}
            </div>
        </div>
    );
};

export default App;
