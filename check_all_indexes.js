import mongoose from 'mongoose';
import config from './config/config.js';

async function checkAllIndexes() {
  await mongoose.connect(config.mongodb.uri, { dbName: config.mongodb.dbName });
  const dbs = await mongoose.connection.db.admin().listDatabases();
  
  for (const dbInfo of dbs.databases) {
    if (dbInfo.name === 'local' || dbInfo.name === 'admin' || dbInfo.name === 'config') continue;
    const db = mongoose.connection.useDb(dbInfo.name);
    const collections = await db.db.listCollections().toArray();
    for (const colInfo of collections) {
      const col = db.db.collection(colInfo.name);
      const indexes = await col.indexes();
      const uniqueIndexes = indexes.filter(idx => idx.unique);
      if (uniqueIndexes.length > 0) {
        console.log(`Database: ${dbInfo.name}, Collection: ${colInfo.name}`);
        uniqueIndexes.forEach(idx => console.log(` - ${idx.name}: ${JSON.stringify(idx.key)}`));
      }
    }
  }
  process.exit(0);
}

checkAllIndexes().catch(console.error);
