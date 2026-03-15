import React, { useState, useEffect } from 'react';
import axios from 'axios';

const App = () => {
    const [activeTab, setActiveTab] = useState('grievance');
    const [complaints, setComplaints] = useState([]);
    const [assistantData, setAssistantData] = useState({ logs: [], metrics: {} });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Auto refresh every 30s
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
                setAssistantData(res.data);
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

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans p-4 md:p-8 selection:bg-blue-500/30">
            {/* Main Header & Tab Switcher */}
            <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-white flex items-center gap-3">
                        <span className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl border border-blue-400/20 shadow-xl shadow-blue-500/20">🏫</span>
                        MSAJCE <span className="text-blue-500">ADMIN</span>
                    </h1>
                    <p className="text-neutral-500 mt-2 font-medium tracking-wide first-letter:uppercase">Unified control center for college services</p>
                </div>

                <div className="flex bg-neutral-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-neutral-800 shadow-2xl">
                    <button 
                        onClick={() => setActiveTab('grievance')}
                        className={`px-6 py-3 rounded-xl text-sm font-black transition-all duration-300 flex items-center gap-2 ${activeTab === 'grievance' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 ring-1 ring-blue-400/30' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'}`}
                    >
                        <span>📂</span> GRIEVANCE MANAGER
                    </button>
                    <button 
                        onClick={() => setActiveTab('assistant')}
                        className={`px-6 py-3 rounded-xl text-sm font-black transition-all duration-300 flex items-center gap-2 ${activeTab === 'assistant' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 ring-1 ring-indigo-400/30' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'}`}
                    >
                        <span>⚡</span> ASSISTANT MONITOR
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto">
                {activeTab === 'grievance' ? (
                    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Grievance Header Controls */}
                        <div className="flex justify-between items-center bg-neutral-900/30 p-4 rounded-2xl border border-neutral-800/50">
                            <h2 className="text-lg font-bold text-neutral-300 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                Live Tickets
                            </h2>
                            <div className="flex bg-black/40 p-1 rounded-xl border border-neutral-800">
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
                                        <p className="text-neutral-500 font-medium">No grievances found matching this criteria.</p>
                                    </div>
                                )}
                                {filteredComplaints.map(c => (
                                    <div key={c._id} className="bg-neutral-900/40 backdrop-blur-xl rounded-3xl border border-neutral-800 p-8 hover:border-neutral-700 hover:bg-neutral-900/60 transition-all duration-300 group relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full translate-x-12 -translate-y-12"></div>
                                        
                                        <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-black px-2.5 py-1 bg-neutral-800 rounded-lg uppercase tracking-[0.2em] text-neutral-400 border border-neutral-700/50">
                                                        {c.complaint_id}
                                                    </span>
                                                    <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ring-1 ring-inset ${
                                                        c.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' : 
                                                        c.status === 'in_progress' ? 'bg-amber-500/10 text-amber-400 ring-amber-500/20' : 
                                                        'bg-sky-500/10 text-sky-400 ring-sky-500/20'
                                                    }`}>
                                                        {c.status.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <h3 className="text-3xl font-black text-white tracking-tight">{c.category}</h3>
                                                <div className="flex items-center gap-2 text-neutral-500 text-xs font-medium">
                                                    <span className="opacity-70">⏱️</span>
                                                    {new Date(c.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <button 
                                                    onClick={() => updateStatus(c.complaint_id, 'in_progress')} 
                                                    className="bg-neutral-800 text-neutral-300 px-5 py-2.5 rounded-xl text-xs font-black tracking-widest hover:bg-amber-500 hover:text-black transition-all border border-neutral-700"
                                                >
                                                    PROCESS
                                                </button>
                                                <button 
                                                    onClick={() => updateStatus(c.complaint_id, 'resolved')} 
                                                    className="bg-neutral-800 text-neutral-300 px-5 py-2.5 rounded-xl text-xs font-black tracking-widest hover:bg-emerald-600 hover:text-white transition-all border border-neutral-700"
                                                >
                                                    RESOLVE
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="p-6 bg-black/40 rounded-2xl border border-neutral-800/50 mb-8">
                                            <p className="text-neutral-300 leading-relaxed text-sm font-medium">{c.description}</p>
                                        </div>
                                        
                                        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-6 border-t border-neutral-800/50">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-sm font-black shadow-lg shadow-blue-600/20">
                                                    {c.student_id?.name?.charAt(0) || 'S'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-white tracking-tight">{c.student_id?.name || 'Anonymous Student'}</p>
                                                    <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">{c.student_id?.department || 'N/A'} • Year {c.student_id?.year || '?'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 px-4 py-2 bg-neutral-900 rounded-xl border border-neutral-800">
                                                <span className="text-[10px] text-neutral-500 font-black tracking-[0.2em] uppercase">ROUTED TO:</span>
                                                <span className="text-xs text-blue-400 font-black tracking-tight underline decoration-blue-500/30 underline-offset-4">{c.department_assigned}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                ) : (
                    <section className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Assistant Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-neutral-900/40 p-8 rounded-3xl border border-neutral-800 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 scale-150 rotate-12 group-hover:rotate-0 transition-transform">📉</div>
                                <p className="text-neutral-500 text-xs font-black tracking-widest mb-2 uppercase">Avg Latency</p>
                                <h4 className="text-4xl font-black text-white">{(assistantData.metrics?.avg_latency || 0).toFixed(0)}<span className="text-lg text-neutral-600 ml-1 font-bold">ms</span></h4>
                            </div>
                            <div className="bg-neutral-900/40 p-8 rounded-3xl border border-neutral-800 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 scale-150 -rotate-12 group-hover:rotate-0 transition-transform">🔥</div>
                                <p className="text-neutral-500 text-xs font-black tracking-widest mb-2 uppercase">Total Requests</p>
                                <h4 className="text-4xl font-black text-white">{assistantData.metrics?.total_requests || 0}</h4>
                            </div>
                            <div className="bg-neutral-900/40 p-8 rounded-3xl border border-neutral-800 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 scale-150 rotate-45 group-hover:rotate-0 transition-transform">✅</div>
                                <p className="text-neutral-500 text-xs font-black tracking-widest mb-2 uppercase">Success Rate</p>
                                <h4 className="text-4xl font-black text-emerald-500">{assistantData.metrics?.success_rate || 100}<span className="text-lg opacity-50 ml-1 font-bold">%</span></h4>
                            </div>
                        </div>

                        {/* Live Activity Log */}
                        <div className="bg-neutral-900/40 rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-black/20">
                                <h3 className="font-black text-neutral-300 tracking-widest text-xs flex items-center gap-3">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                                    LIVE ACTIVITY STREAM
                                </h3>
                                <div className="text-[10px] font-mono text-neutral-600">POLLING: 30s</div>
                            </div>
                            <div className="p-4 space-y-1 font-mono max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-800">
                                {assistantData.logs?.length === 0 && (
                                    <div className="py-10 text-center text-neutral-600">No recent logs available.</div>
                                )}
                                {assistantData.logs?.map((log, idx) => (
                                    <div key={idx} className="flex gap-4 p-3 hover:bg-neutral-800/50 rounded-lg group transition-colors">
                                        <span className="text-[10px] text-neutral-700 group-hover:text-neutral-500 shrink-0 mt-1">
                                            [{new Date(log.timestamp).toLocaleTimeString()}]
                                        </span>
                                        <span className={`text-[10px] font-black shrink-0 mt-1 ${
                                            log.type === 'error' ? 'text-red-500' : 
                                            log.type === 'intent' ? 'text-blue-400' : 'text-emerald-500'
                                        }`}>
                                            {log.type.toUpperCase()}
                                        </span>
                                        <p className="text-xs text-neutral-400 group-hover:text-neutral-200 leading-relaxed">
                                            {log.message}
                                        </p>
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
