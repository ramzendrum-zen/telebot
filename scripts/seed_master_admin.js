import mongoose from 'mongoose';
import dotenv from 'dotenv';
import config from '../config/config.js';
import { generateEmbedding } from '../services/embeddingService.js';

dotenv.config();

const masterAdmin = [
  { id: 'admin_principal', title: 'Principal of MSAJCE', name: 'Dr. K.S. SRINIVASAN', role: 'Principal', phone: '9150575066', email: 'principal@msajce-edu.in', qualification: 'B.E., M.Tech., Ph.D.' },
  { id: 'admin_vice_principal', title: 'Vice Principal of MSAJCE', name: 'Dr. I. MANJU', role: 'Vice Principal & HOD/ECE', phone: '99403 55026', email: 'ece.manju@msajce-edu.in', qualification: 'M.E., Ph.D.' },
  { id: 'admin_transport_convener', title: 'Transport Convener', name: 'Dr. K. P. SANTHOSH NATHAN', role: 'Transport Convener (Dir. PD)', phone: '98408 86992', email: 'ped.santhosh@msajce-edu.in' },
  { id: 'admin_asst_transport_convener', title: 'Assistant Transport Convener', name: 'Mr. A. ABDUL GAFOOR', role: 'Asst. Transport Convener', phone: '99403 19629' },
  { id: 'hod_it', title: 'HOD of IT Department', name: 'Dr. D. WESLIN', role: 'Associate Professor & HOD', phone: '9715202533', email: 'it.weslin@msajce-edu.in' },
  { id: 'admin_contact', title: 'College Contact Information', role: 'MSAJCE Office', phone: '+91 99400 04500', email: 'contact@msajce-edu.in', address: 'Mohamed Sathak A. J. College of Engineering, Egattur, Old Mahabalipuram Rd, Chennai, Tamil Nadu 603103' },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
  const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);

  console.log("Seeding Master Admin Chunks...");
  for (const item of masterAdmin) {
    const contact = item.phone || item.email || '';
    const content = `MASTER DATA: The ${item.role} of MSAJCE is ${item.name || 'MSAJCE Office'}. 
    Title: ${item.title}.
    Contact: ${contact}.
    Address: ${item.address || 'N/A'}. 
    Qualification: ${item.qualification || 'N/A'}.`;
    
    // Check if exists
    const existing = await col.findOne({ document_id: item.id });
    if (existing) {
        console.log(`Updating ${item.id}...`);
        await col.updateOne({ document_id: item.id }, { $set: { content, text: content, source: 'verified_data' } });
    } else {
        console.log(`Inserting ${item.id}...`);
        const embedding = await generateEmbedding(content);
        await col.insertOne({
            document_id: item.id,
            source: "verified_data",
            category: "admin",
            title: item.title,
            content,
            text: content,
            embedding,
            metadata: { name: item.name, role: item.role, phone: item.phone, email: item.email }
        });
    }
  }

  process.exit(0);
}

run();
