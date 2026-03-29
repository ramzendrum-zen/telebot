import mongoose from 'mongoose';
import config from './config/config.js';
import { normalize } from './utils/textUtils.js';

const ENTITY_MAP = {
  principal: { name: 'Dr. K.S. Srinivasan', role: 'Principal', aliases: ['ss', 'srinivasan', 'ks srinivasan', 'principal srinivasan'], dept: 'Admin' },
  warden: { name: 'Dr. K.S. Srinivasan', role: 'Warden', aliases: ['hostel warden', 'warden srinivasan'], dept: 'Hostel' },
  'csi president': { name: 'Yogesh R', role: 'Student President', aliases: ['yogesh', 'csi head', 'yogesh president'], dept: 'CSI' },
  'transport convener': { name: 'Abdul Gafoor', role: 'Transport Convener', aliases: ['gafoor', 'abdul', 'abdul gafoor'], dept: 'Transport' },
  'it hod': { name: 'Dr. S. Maria Celestin Vigila', role: 'HOD', aliases: ['maria', 'vigila', 'maria vigilas', 'it head'], dept: 'IT' },
  'cse hod': { name: 'Dr. P. Felcy Judith', role: 'HOD', aliases: ['felcy', 'judith', 'cse head'], dept: 'CSE' }
};

async function seedEntities() {
    console.log("🚀 Upgrading entities_master with Normalization + Alias Expansion...");
    await mongoose.connect(config.mongodb.uri, { dbName: config.mongodb.dbName });
    const db = mongoose.connection.db;
    const coll = db.collection('entities_master');
    
    await coll.deleteMany({});
    
    // Process main map
    const docs = Object.values(ENTITY_MAP).map(e => {
        const normalized_name = normalize(e.name);
        
        // Auto-generate aliases (Step 2: Remove initials)
        const parts = normalized_name.split(' ');
        const autoAliases = parts.length > 2 ? [parts[parts.length - 1], parts.slice(1).join(' ')] : [parts[parts.length - 1]];
        
        const combinedAliases = [...new Set([...e.aliases, ...autoAliases])];
        const normalized_aliases = combinedAliases.map(a => normalize(a));

        return {
            name: e.name,
            normalized_name,
            aliases: combinedAliases,
            normalized_aliases,
            role: e.role,
            department: e.dept,
            keywords: [e.role.toLowerCase(), e.dept.toLowerCase()],
            content: `• Name: ${e.name}\n• Role: ${e.role}\n• Department: ${e.dept}`,
            ingested_at: new Date()
        };
    });

    await coll.insertMany(docs);
    
    // Process staff from legacy vector_store
    const legacyColl = db.collection('vector_store');
    const staffDocs = await legacyColl.find({ category: 'staff' }).toArray();
    
    for (const s of staffDocs) {
        if (!s.metadata?.name) continue;
        const exists = await coll.findOne({ name: s.metadata.name });
        if (!exists) {
            const normalized_name = normalize(s.metadata.name);
            const mainAlias = normalized_name.split(' ').pop();
            
            await coll.insertOne({
                name: s.metadata.name,
                normalized_name,
                aliases: [mainAlias],
                normalized_aliases: [normalize(mainAlias)],
                role: s.metadata.role || 'Staff',
                department: s.metadata.department || 'N/A',
                keywords: [(s.metadata.role || '').toLowerCase()],
                content: s.text || s.content,
                ingested_at: new Date()
            });
        }
    }

    console.log("✅ entities_master (Production Upgrade Pack) seeded.");
    process.exit(0);
}

seedEntities();

