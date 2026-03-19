import mongoose from 'mongoose';
import config from './config/config.js';

async function checkUser() {
  await mongoose.connect(config.mongodb.uri, { dbName: config.mongodb.dbName });
  const User = mongoose.connection.db.collection('users');
  const user = await User.findOne({ telegram_id: 7770158141 });
  console.log("User 7770158141:");
  console.log(JSON.stringify(user, null, 2));
  
  const allUsers = await User.find({}).toArray();
  console.log("Total users:", allUsers.length);
  
  process.exit(0);
}

checkUser().catch(console.error);
