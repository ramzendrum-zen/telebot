import React, { useState, useEffect } from 'react';
import axios from 'axios';

const App = () => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        try {
            const res = await axios.get('/api/admin/complaints');
            setComplaints(res.data);
            setLoading(false);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await axios.patch(`/api/admin/complaints/${id}`, { status });
            fetchComplaints();
        } catch (e) { console.error(e); }
    };

    const filtered = filter === 'all' ? complaints : complaints.filter(c => c.status === filter);

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans p-4 md:p-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
                        <span className="bg-blue-600 p-1.5 rounded">🏫</span>
                        MSAJCE ADMIN
                    </h1>
                    <p className="text-neutral-500 mt-1 font-medium">Grievance Management Dashboard</p>
                </div>
                <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                    {['all', 'submitted', 'in_progress', 'resolved'].map(s => (
                        <button 
                            key={s}
                            onClick={() => setFilter(s)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === s ? 'bg-blue-600 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            {s.toUpperCase()}
                        </button>
                    ))}
                </div>
            </header>

            {loading ? (
                <div className="animate-pulse space-y-4">
                    {[1,2,3].map(i => <div key={i} className="h-32 bg-neutral-900 rounded-2xl border border-neutral-800"></div>)}
                </div>
            ) : (
                <div className="grid gap-6">
                    {filtered.map(c => (
                        <div key={c._id} className="bg-neutral-900/50 backdrop-blur-xl rounded-2xl border border-neutral-800 p-6 hover:border-neutral-700 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-xs font-black px-2 py-0.5 bg-neutral-800 rounded uppercase tracking-widest text-neutral-400">
                                            {c.complaint_id}
                                        </span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                                            c.status === 'resolved' ? 'bg-green-500/10 text-green-500' : 
                                            c.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'
                                        }`}>
                                            {c.status}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold mb-1">{c.category}</h3>
                                    <p className="text-neutral-400 text-sm italic">Submitted on {new Date(c.created_at).toLocaleString()}</p>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => updateStatus(c.complaint_id, 'in_progress')} className="bg-yellow-500/10 text-yellow-500 p-2 rounded-lg text-xs font-bold hover:bg-yellow-500 hover:text-black">PROCESS</button>
                                    <button onClick={() => updateStatus(c.complaint_id, 'resolved')} className="bg-green-500/10 text-green-500 p-2 rounded-lg text-xs font-bold hover:bg-green-500 hover:text-black">RESOLVE</button>
                                </div>
                            </div>
                            
                            <div className="p-4 bg-black/40 rounded-xl border border-neutral-800/50">
                                <p className="text-neutral-300 leading-relaxed text-sm">{c.description}</p>
                            </div>
                            
                            <div className="mt-4 flex flex-col md:flex-row justify-between items-center gap-4 pt-4 border-t border-neutral-800/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                                        {c.student_id?.name?.charAt(0) || 'S'}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white">{c.student_id?.name || 'Anonymous Student'}</p>
                                        <p className="text-[10px] text-neutral-500">{c.student_id?.department || 'N/A'} • Year {c.student_id?.year || '?'}</p>
                                    </div>
                                </div>
                                <div className="text-[10px] text-neutral-500 font-mono">
                                    ASSIGNED: <span className="text-neutral-300 font-bold">{c.department_assigned}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default App;
