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
    console.log("🚀 Upgrading entities_master with ALL categorical data...");
    await mongoose.connect(config.mongodb.uri, { dbName: config.mongodb.dbName });
    const db = mongoose.connection.db;
    const coll = db.collection('entities_master');
    
    await coll.deleteMany({});
    
    // 1. Process Hardcoded Map
    const docs = Object.values(ENTITY_MAP).map(e => {
        const normalized_name = normalize(e.name);
        const parts = normalized_name.split(' ');
        const autoAliases = parts.length > 2 ? [parts[parts.length - 1], parts.slice(1).join(' ')] : [parts[parts.length - 1]];
        const combinedAliases = [...new Set([...e.aliases, ...autoAliases])];
        
        return {
            name: e.name,
            normalized_name,
            aliases: combinedAliases,
            normalized_aliases: combinedAliases.map(a => normalize(a)),
            role: e.role,
            department: e.dept,
            keywords: [e.role.toLowerCase(), e.dept.toLowerCase()],
            content: `• Name: ${e.name}\n• Role: ${e.role}\n• Department: ${e.dept}`,
            ingested_at: new Date()
        };
    });
    await coll.insertMany(docs);

    // 2. Auto-discover from vector_store (ALL CATEGORIES)
    const vectorColl = db.collection('vector_store');
    const allData = await vectorColl.find({}).toArray();
    
    for (const item of allData) {
        let name = item.metadata?.name || item.name || item.metadata?.driver || item.title;
        if (!name) continue;

        const exists = await coll.findOne({ name });
        if (!exists) {
            const normalized_name = normalize(name);
            const mainAlias = normalized_name.split(' ').pop();
            const role = item.metadata?.role || (item.category === 'transport' ? 'Driver' : 'Facility');
            const dept = item.metadata?.department || item.category || 'MSAJCE';

            await coll.insertOne({
                name,
                normalized_name,
                aliases: [mainAlias],
                normalized_aliases: [normalize(mainAlias)],
                role: role,
                department: dept,
                keywords: [role.toLowerCase(), (item.category || '').toLowerCase()],
                content: item.text || item.content || `• Name: ${name}\n• Role: ${role}\n• Detail: ${item.category}`,
                ingested_at: new Date()
            });
        }

        // Special handling for Routes (AR-5 etc)
        if (item.metadata?.route) {
            const routeName = item.metadata.route;
            const routeAlias = routeName.replace('-', ''); // "AR5" matches "AR-5"
            await coll.updateOne(
                { name: routeName },
                {
                    $setOnInsert: {
                        name: routeName,
                        normalized_name: normalize(routeName),
                        aliases: [routeAlias],
                        normalized_aliases: [normalize(routeAlias)],
                        role: 'Route',
                        department: 'Transport',
                        content: item.text || item.content,
                        ingested_at: new Date()
                    }
                },
                { upsert: true }
            );
        }
    }

    console.log(`✅ entities_master fully expanded from vector_store.`);
    process.exit(0);
}

seedEntities();

