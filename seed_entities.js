const ENTITY_MAP = {
  principal: { name: 'Dr. K.S. Srinivasan', role: 'Principal', aliases: ['ss', 'srinivasan'], dept: 'Admin' },
  warden: { name: 'Dr. K.S. Srinivasan', role: 'Warden', aliases: ['hostel warden'], dept: 'Hostel' },
  'csi president': { name: 'Yogesh R', role: 'Student President', aliases: ['yogesh', 'csi head'], dept: 'CSI' },
  'transport convener': { name: 'Abdul Gafoor', role: 'Transport Convener', aliases: ['gafoor', 'abdul'], dept: 'Transport' },
  'it hod': { name: 'Dr. S. Maria Celestin Vigila', role: 'HOD', aliases: ['maria', 'vigila'], dept: 'IT' },
  'cse hod': { name: 'Dr. P. Felcy Judith', role: 'HOD', aliases: ['felcy', 'judith'], dept: 'CSE' }
};

import mongoose from 'mongoose';
import config from './config/config.js';

async function seedEntities() {
    await mongoose.connect(config.mongodb.uri, { dbName: config.mongodb.dbName });
    const db = mongoose.connection.db;
    const coll = db.collection('entities_master');
    
    await coll.deleteMany({});
    
    const docs = Object.values(ENTITY_MAP).map(e => ({
        name: e.name,
        normalized_name: e.name.toLowerCase(),
        aliases: e.aliases.map(a => a.toLowerCase()),
        role: e.role,
        department: e.dept,
        keywords: [e.role.toLowerCase(), e.dept.toLowerCase()],
        content: `Name: ${e.name}. Role: ${e.role}. Department: ${e.dept}.`,
        ingested_at: new Date()
    }));

    await coll.insertMany(docs);
    
    // Additional scan of vector_store for 'staff' category
    const legacyColl = db.collection('vector_store');
    const staffDocs = await legacyColl.find({ category: 'staff' }).toArray();
    
    for (const s of staffDocs) {
        if (!s.metadata?.name) continue;
        const exists = await coll.findOne({ name: s.metadata.name });
        if (!exists) {
            await coll.insertOne({
                name: s.metadata.name,
                normalized_name: s.metadata.name.toLowerCase(),
                aliases: [s.metadata.name.toLowerCase().split(' ')[0]],
                role: s.metadata.role || 'Staff',
                department: s.metadata.department || 'N/A',
                keywords: [(s.metadata.role || '').toLowerCase()],
                content: s.text || s.content,
                ingested_at: new Date()
            });
        }
    }

    console.log("✅ entities_master collection seeded.");
    process.exit(0);
}

seedEntities();
