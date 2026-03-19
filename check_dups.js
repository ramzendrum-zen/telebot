import mongoose from 'mongoose';
import config from './config/config.js';

async function checkDups() {
  await mongoose.connect(config.mongodb.uri, { dbName: config.mongodb.dbName });
  const Complaint = mongoose.connection.db.collection('complaints');
  
  const all = await Complaint.find({}).toArray();
  console.log("Total complaints:", all.length);
  const ids = all.map(c => c.complaint_id);
  const counts = {};
  ids.forEach(id => counts[id] = (counts[id] || 0) + 1);
  
  console.log("Duplicate IDs:");
  Object.keys(counts).forEach(id => {
    if (counts[id] > 1) console.log(` - ${id}: ${counts[id]}`);
  });

  console.log("Latest IDs:");
  const latestGRV = await Complaint.find({ complaint_id: /^GRV-/ }).sort({ complaint_id: -1 }).limit(5).toArray();
  latestGRV.forEach(c => console.log(` - ${c.complaint_id} (${c.created_at})`));

  process.exit(0);
}

checkDups().catch(console.error);
