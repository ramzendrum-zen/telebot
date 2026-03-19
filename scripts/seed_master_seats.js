import mongoose from 'mongoose';
import dotenv from 'dotenv';
import config from '../config/config.js';
import { generateEmbedding } from '../services/embeddingService.js';

dotenv.config();

const masterData = [
  // 🎓 SEATS (Intake)
  { id: 'seats_cse', title: 'Seats in CSE Department', category: 'admission', content: 'The intake for B.E. Computer Science and Engineering (CSE) is 60 seats (30 Government Quota, 30 Management Quota). M.E. CSE has 9 seats.', entities: ['CSE', 'Computer Science', 'seats', 'intake', 'BE'] },
  { id: 'seats_it', title: 'Seats in IT Department', category: 'admission', content: 'The intake for B.Tech. Information Technology (IT) is 60 seats (30 Government Quota, 30 Management Quota).', entities: ['IT', 'Information Technology', 'seats', 'intake'] },
  { id: 'seats_aiml', title: 'Seats in AI & ML Department', category: 'admission', content: 'The intake for B.Tech. Artificial Intelligence and Machine Learning (AI&ML) is 60 seats.', entities: ['AI&ML', 'seats', 'intake'] },
  { id: 'seats_aids', title: 'Seats in AI & DS Department', category: 'admission', content: 'The intake for B.Tech. Artificial Intelligence and Data Science (AI&DS) is 30 seats.', entities: ['AI&DS', 'seats', 'intake'] },
  { id: 'seats_csbs', title: 'Seats in CSBS Department', category: 'admission', content: 'The intake for B.Tech. Computer Science and Business Systems (CSBS) is 30 seats.', entities: ['CSBS', 'seats', 'intake'] },
  { id: 'seats_cyber', title: 'Seats in Cyber Security', category: 'admission', content: 'The intake for B.E. Computer Science and Engineering (Cyber Security) is 30 seats.', entities: ['Cyber Security', 'Cybersecurity', 'seats', 'intake'] },
  { id: 'seats_ece', title: 'Seats in ECE Department', category: 'admission', content: 'The intake for B.E. Electronics and Communication Engineering (ECE) is 60 seats. ECE w/s in Advanced Communication Technology has 30 seats.', entities: ['ECE', 'Electronics', 'seats', 'intake'] },
  { id: 'seats_eee', title: 'Seats in EEE Department', category: 'admission', content: 'The intake for B.E. Electrical and Electronics Engineering (EEE) is 30 seats.', entities: ['EEE', 'Electrical', 'seats', 'intake'] },
  { id: 'seats_mech', title: 'Seats in Mech Department', category: 'admission', content: 'The intake for B.E. Mechanical Engineering is 30 seats.', entities: ['Mech', 'Mechanical', 'seats', 'intake'] },
  { id: 'seats_civil', title: 'Seats in Civil Department', category: 'admission', content: 'The intake for B.E. Civil Engineering is 30 seats.', entities: ['Civil', 'seats', 'intake'] },
  { id: 'seats_vlsi', title: 'Seats in VLSI Design', category: 'admission', content: 'The intake for B.E. Electronics Engineering w/s in VLSI Design & Technology is 30 seats.', entities: ['VLSI', 'seats', 'intake'] },
  
  // 💰 SCHOLARSHIPS
  { id: 'scholar_sports', title: 'Sports Quota Scholarship', category: 'admission', content: 'MSAJCE offers admission through Sports Quota and provides scholarships to District, State, and National level sports participants.', entities: ['scholarship', 'sports', 'quota', 'admission'] },
  { id: 'scholar_alumni', title: 'Alumni Scholarship Contribution', category: 'admission', content: 'The MSAJCE Alumni Association provides financial assistance and scholarships to needy students through its fund.', entities: ['scholarship', 'alumni', 'funds', 'needy students'] },
  { id: 'scholar_minority', title: 'Minority & Girl Scholarship', category: 'admission', content: 'As a minority institution, MSAJCE facilitates various government and trust-based scholarships for minority students and female students.', entities: ['scholarship', 'minority', 'muslim', 'ladies', 'girls', 'female'] },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
  const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);

  console.log("Seeding Master Seats & Scholarship Chunks...");
  for (const item of masterData) {
    const text = `MASTER RECORD: ${item.content}`;
    
    // Check if exists
    const existing = await col.findOne({ document_id: item.id });
    if (existing) {
        console.log(`Updating ${item.id}...`);
        await col.updateOne({ document_id: item.id }, { $set: { content: text, text, source: 'verified_data' } });
    } else {
        console.log(`Inserting ${item.id}...`);
        const embedding = await generateEmbedding(text);
        await col.insertOne({
            document_id: item.id,
            source: "verified_data",
            category: item.category,
            title: item.title,
            content: text,
            text,
            embedding,
            entities: item.entities,
            metadata: { type: "master_value", ...item }
        });
    }
  }

  process.exit(0);
}

run();
