import mongoose from 'mongoose';
import config from './config/config.js';

async function listDBs() {
  await mongoose.connect(config.mongodb.uri);
  const admin = mongoose.connection.db.admin();
  const dbs = await admin.listDatabases();
  console.log("Databases:");
  dbs.databases.forEach(db => console.log(` - ${db.name}`));

  for (const dbInfo of dbs.databases) {
    if (dbInfo.name === 'local' || dbInfo.name === 'admin' || dbInfo.name === 'config') continue;
    const db = mongoose.connection.useDb(dbInfo.name);
    const collections = await db.db.listCollections().toArray();
    console.log(`Collections in ${dbInfo.name}:`);
    collections.forEach(c => console.log(`  - ${c.name}`));
  }

  process.exit(0);
}

listDBs().catch(console.error);
