import React, { useState, useEffect } from 'react';
import axios from 'axios';

const App = () => {
    const [activeTab, setActiveTab] = useState('grievance');
    const [complaints, setComplaints] = useState([]);
    const [monitorData, setMonitorData] = useState({ logs: [], metrics: { assistant: {}, grievance: {} } });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [botLogFilter, setBotLogFilter] = useState('all');

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000); // Faster refresh for live feel
        return () => clearInterval(interval);
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'grievance') {
                const res = await axios.get('/api/admin/complaints');
                setComplaints(res.data);
            } else {
                const res = await axios.get('/api/monitor');
                setMonitorData(res.data);
            }
            setLoading(false);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await axios.patch(`/api/admin/complaints/${id}`, { status });
            fetchData();
        } catch (e) { console.error(e); }
    };

    const filteredComplaints = filter === 'all' ? complaints : complaints.filter(c => c.status === filter);
    const filteredLogs = botLogFilter === 'all' ? monitorData.logs : monitorData.logs.filter(l => l.bot === botLogFilter);

    const MetricsCard = ({ title, bot, data, color }) => {
        const colorMap = {
            indigo: { text: 'text-indigo-500', bg: 'bg-indigo-500', border: 'hover:border-indigo-500/50', glow: 'bg-indigo-500/5' },
            amber: { text: 'text-amber-500', bg: 'bg-amber-500', border: 'hover:border-amber-500/50', glow: 'bg-amber-500/5' }
        };
        const theme = colorMap[color];

        return (
            <div className={`bg-neutral-900/40 p-6 rounded-3xl border border-neutral-800 relative overflow-hidden group ${theme.border} transition-all`}>
                <div className={`absolute top-0 right-0 w-24 h-24 ${theme.glow} blur-3xl rounded-full translate-x-12 -translate-y-12`}></div>
                <div className="flex justify-between items-start mb-4">
                    <p className="text-neutral-500 text-[10px] font-black tracking-widest uppercase">{title} ({bot.toUpperCase()})</p>
                    <span className={`w-2 h-2 rounded-full ${theme.bg} animate-pulse`}></span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="text-2xl font-black text-white leading-tight">{(data?.avg_latency || 0).toFixed(0)}<span className="text-[10px] text-neutral-600 ml-1 font-bold uppercase">ms</span></h4>
                        <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-tighter">Avg Latency</p>
                    </div>
                    <div>
                        <h4 className="text-2xl font-black text-white leading-tight">{data?.total_requests || 0}</h4>
                        <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-tighter">Total Hits</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 font-sans p-4 md:p-8 selection:bg-blue-500/30">
            {/* Header */}
            <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-white flex items-center gap-3">
                        <span className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl border border-blue-400/20 shadow-xl shadow-blue-500/20">🏫</span>
                        MSAJCE <span className="text-blue-500">ADMIN</span>
                    </h1>
                    <p className="text-neutral-500 mt-2 font-medium tracking-wide first-letter:uppercase">Institutional Fleet & Grievance Control</p>
                </div>

                <div className="flex bg-neutral-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-neutral-800 shadow-2xl">
                    <button 
                        onClick={() => setActiveTab('grievance')}
                        className={`px-6 py-3 rounded-xl text-sm font-black transition-all duration-300 flex items-center gap-2 ${activeTab === 'grievance' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 ring-1 ring-blue-400/30' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'}`}
                    >
                        <span>📁</span> TICKETS
                    </button>
                    <button 
                        onClick={() => setActiveTab('assistant')}
                        className={`px-6 py-3 rounded-xl text-sm font-black transition-all duration-300 flex items-center gap-2 ${activeTab === 'assistant' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 ring-1 ring-indigo-400/30' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'}`}
                    >
                        <span>⚡</span> BOT STATS
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto">
                {activeTab === 'grievance' ? (
                    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Grievance Controls */}
                        <div className="flex justify-between items-center bg-neutral-900/30 p-5 rounded-2xl border border-neutral-800/50">
                            <h2 className="text-lg font-bold text-neutral-300 flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse hidden md:block"></span>
                                Live Tickets
                            </h2>
                            <div className="flex bg-black/40 p-1 rounded-xl border border-neutral-800 flex-wrap">
                                {['all', 'submitted', 'in_progress', 'resolved'].map(s => (
                                    <button 
                                        key={s}
                                        onClick={() => setFilter(s)}
                                        className={`px-4 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all ${filter === s ? 'bg-neutral-800 text-white shadow-inner' : 'text-neutral-500 hover:text-neutral-300'}`}
                                    >
                                        {s.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {loading ? (
                            <div className="grid gap-6">
                                {[1,2,3].map(i => <div key={i} className="h-48 bg-neutral-900/50 animate-pulse rounded-3xl border border-neutral-800"></div>)}
                            </div>
                        ) : (
                            <div className="grid gap-6">
                                {filteredComplaints.length === 0 && (
                                    <div className="text-center py-20 bg-neutral-900/20 rounded-3xl border border-neutral-800 border-dashed">
                                        <p className="text-neutral-500 font-medium">No grievances on record.</p>
                                    </div>
                                )}
                                {filteredComplaints.map(c => (
                                    <div key={c._id} className="bg-[#111] backdrop-blur-xl rounded-2xl border border-neutral-800 p-8 hover:border-neutral-700 transition-all duration-300 group overflow-hidden shadow-sm">
                                        <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-black px-3 py-1 bg-neutral-800/50 rounded-full uppercase tracking-widest text-[#9CA3AF] border border-[#374151]">
                                                        {c.complaint_id}
                                                    </span>
                                                    <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                                                        c.status === 'resolved' ? 'bg-[#064e3b] text-[#34d399] border border-[#059669]' : 
                                                        c.status === 'in_progress' ? 'bg-[#78350f] text-[#fbbf24] border border-[#b45309]' : 
                                                        c.status === 'rejected' ? 'bg-[#023e8a] text-[#00b4d8] border border-[#0077b6]' :
                                                        'bg-[#1e3a8a] text-[#60a5fa] border border-[#2563eb]'
                                                    }`}>
                                                        {c.status.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <h3 className="text-2xl font-black text-white tracking-tight">{c.category}</h3>
                                                <div className="text-[#6B7280] text-xs font-bold uppercase tracking-widest">
                                                    SUBMITTED: {new Date(c.created_at).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' }).toUpperCase()}
                                                </div>
                                                {c.status === 'resolved' && (
                                                    <div className="text-[#10B981] text-[10px] flex items-center gap-1.5 font-bold uppercase tracking-widest">
                                                        <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full"></span> RESOLVED AT: {new Date(c.updated_at || c.created_at).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' }).toUpperCase()}
                                                    </div>
                                                )}
                                                {c.status === 'rejected' && (
                                                    <div className="text-[#10B981] text-[10px] flex items-center gap-1.5 font-bold uppercase tracking-widest">
                                                        <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full"></span> REJECTED AT: {new Date(c.updated_at || c.created_at).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' }).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-3">
                                                <button onClick={() => updateStatus(c.complaint_id, 'in_progress')} className="bg-[#262626] text-neutral-300 px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest hover:bg-[#404040] transition-all">PROCESS</button>
                                                <button onClick={() => updateStatus(c.complaint_id, 'resolved')} className="bg-[#262626] text-neutral-300 px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest hover:bg-[#404040] transition-all">RESOLVE</button>
                                            </div>
                                        </div>
                                        
                                        <div className="p-6 bg-[#0a0a0a] rounded-xl border border-neutral-800/50 mb-6">
                                            <span className="text-[10px] font-black text-[#4B5563] uppercase tracking-widest block mb-2">DESCRIPTION:</span>
                                            <p className="text-[#D1D5DB] text-sm font-semibold leading-relaxed flex items-center gap-2">
                                                {c.is_emergency && <span className="animate-pulse">🚨</span>}
                                                {c.description}
                                            </p>
                                        </div>
                                        
                                        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-6 border-t border-neutral-800/50">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-xs font-black text-white">
                                                    {c.student_id?.name?.charAt(0) || 'S'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-white">{c.student_id?.name || 'Anonymous'}</p>
                                                    <p className="text-[10px] text-[#6B7280] font-black uppercase tracking-widest">{c.student_id?.department || 'N/A'}</p>
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-[#60A5FA] font-black tracking-widest uppercase px-4 py-2 bg-[#172554] rounded-full border border-[#1E3A8A]">
                                                ROUTED TO: {c.department_assigned}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                ) : (
                    <section className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Dual Bot Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <MetricsCard title="Knowledge Assistant" bot="assistant" data={monitorData.metrics?.assistant} color="indigo" />
                            <MetricsCard title="Grievance Dispatch" bot="grievance" data={monitorData.metrics?.grievance} color="amber" />
                        </div>

                        {/* Unified Log Stream */}
                        <div className="bg-neutral-900/40 rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-neutral-800 flex flex-col md:flex-row justify-between items-center bg-black/20 gap-4">
                                <h3 className="font-black text-neutral-300 tracking-widest text-xs flex items-center gap-3">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                                    LIVE BOT ACTIVITY STREAM
                                </h3>
                                
                                <div className="flex bg-black/40 p-1 rounded-xl border border-neutral-800">
                                    {[
                                        { id: 'all', label: 'ALL LOGS' },
                                        { id: 'assistant', label: 'ASSISTANT' },
                                        { id: 'grievance', label: 'GRIEVANCE' }
                                    ].map(b => (
                                        <button 
                                            key={b.id}
                                            onClick={() => setBotLogFilter(b.id)}
                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest transition-all ${botLogFilter === b.id ? 'bg-neutral-800 text-white shadow-inner' : 'text-neutral-500 hover:text-neutral-300'}`}
                                        >
                                            {b.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="p-4 space-y-1 font-mono max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-800 bg-neutral-950/20">
                                {filteredLogs?.length === 0 && (
                                    <div className="py-20 text-center text-neutral-600 text-xs font-black tracking-widest uppercase">IDLE • Awaiting Bot Input</div>
                                )}
                                {filteredLogs?.map((log, idx) => (
                                    <div key={idx} className="flex gap-4 p-4 hover:bg-neutral-800/30 rounded-2xl group transition-all border border-transparent hover:border-neutral-800">
                                        <div className="flex flex-col items-center gap-2 shrink-0">
                                            <span className="text-[9px] text-neutral-600 font-bold">
                                                {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </span>
                                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter ${
                                                log.bot === 'assistant' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-400'
                                            }`}>
                                                {log.bot}
                                            </span>
                                        </div>
                                        
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${
                                                    log.type === 'error' ? 'text-red-500' : 
                                                    log.type === 'intent' ? 'text-blue-400' : 'text-emerald-500'
                                                }`}>
                                                    {log.type}
                                                </span>
                                                {log.metadata?.latency && (
                                                    <span className="text-[9px] text-neutral-700 font-bold bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                                                        {log.metadata.latency}ms
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-neutral-400 group-hover:text-neutral-200 leading-relaxed font-medium">
                                                {log.message}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
};

export default App;
