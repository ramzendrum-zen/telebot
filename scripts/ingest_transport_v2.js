import mongoose from 'mongoose';
import dotenv from 'dotenv';
import config from '../config/config.js';
import { generateEmbedding } from '../services/embeddingService.js';

dotenv.config();

const transportData = {
    "public_transport_mtc": {
      "stop_name": "SIPCOT / Siruseri IT Park",
      "routes": [
        { "routeNo": "19", "start": "T. Nagar", "end": "Thiruporur", "via": "OMR, Madhiya Kailash, SRP", "freq": "Daily" },
        { "routeNo": "519", "start": "T. Nagar", "end": "Thiruporur", "via": "Saidapet, Adyar, SRP", "freq": "Daily" },
        { "routeNo": "221H", "start": "Central", "end": "Thiruporur", "via": "Anna Salai, Saidapet, SRP", "freq": "Daily" },
        { "routeNo": "102X", "start": "Broadway", "end": "Thiruporur", "via": "Marina, Adyar, OMR", "freq": "Daily" },
        { "routeNo": "102S", "start": "Broadway", "end": "Sipcot", "via": "Marina, Adyar, OMR", "freq": "Daily" },
        { "routeNo": "102", "start": "Broadway", "end": "Kelambakkam", "via": "Marina, Adyar, OMR", "freq": "Daily" },
        { "routeNo": "B19", "start": "Shollinganallur", "end": "Kelambakkam", "via": "Sipcot, OMR", "freq": "Daily" },
        { "routeNo": "570", "start": "CMBT", "end": "Kelambakkam", "via": "Vadapalani, Velachery, SRP", "freq": "Daily" },
        { "routeNo": "570S", "start": "CMBT", "end": "Sipcot", "via": "Vadapalani, Velachery, SRP", "freq": "Daily" },
        { "routeNo": "105", "start": "Tambaram", "end": "Siruseri", "via": "Thalambur", "freq": "Daily" }
      ]
    },
    "college_buses": [
      {
        "route_no": "AR-3",
        "driver": { "name": "Mr. Sathish K", "mobile": "+91-9789970304" },
        "stops": [
          { "stop": "G.H Hospital", "time": "06:20" }, { "stop": "Paranur Tollgate", "time": "06:35" }, { "stop": "Mahindra City", "time": "06:40" },
          { "stop": "S.P. Koil", "time": "06:45" }, { "stop": "Maraimalai Nagar", "time": "06:48" }, { "stop": "Guduvanchery", "time": "06:50" },
          { "stop": "Ooraapakkam", "time": "06:52" }, { "stop": "Vandalur Zoo", "time": "06:55" }, { "stop": "Perungalathur", "time": "07:00" },
          { "stop": "Kandigai", "time": "07:15" }, { "stop": "Mambakkam", "time": "07:25" }, { "stop": "Puthupakkam", "time": "07:30" },
          { "stop": "Kelambakkam", "time": "07:40" }, { "stop": "SIPCOT", "time": "07:50" }, { "stop": "M.S.A.J.C.E – College", "time": "08:00" }
        ]
      },
      {
        "route_no": "AR-4",
        "driver": { "name": "Mr. M. Suresh", "mobile": "+91-9849265637" },
        "stops": [
          { "stop": "Moolakadai", "time": "06:10" }, { "stop": "Perambur Railway Station", "time": "06:15" }, { "stop": "Otteri Pattalam", "time": "06:18" },
          { "stop": "Dowton", "time": "06:23" }, { "stop": "Vepery Police Station", "time": "06:25" }, { "stop": "Periyamed", "time": "06:30" },
          { "stop": "Central", "time": "06:35" }, { "stop": "Parrys Corner", "time": "06:40" }, { "stop": "Marina Beach", "time": "06:45" },
          { "stop": "Santhome", "time": "06:50" }, { "stop": "Adyar", "time": "07:00" }, { "stop": "Thiruvanmiyur", "time": "07:05" },
          { "stop": "Palavakkam", "time": "07:10" }, { "stop": "Neelankarai", "time": "07:15" }, { "stop": "Akkarai Water Tank", "time": "07:20" },
          { "stop": "Sholinganallur", "time": "07:25" }, { "stop": "Ladies Hostel", "time": "07:30" }, { "stop": "M.S.A.J.C.E – College", "time": "08:00" }
        ]
      },
      {
        "route_no": "AR-5",
        "driver": { "name": "Mr. Velu", "mobile": "+91-9940050685" },
        "stops": [
          { "stop": "MMDA School", "time": "06:15" }, { "stop": "Anna Nagar", "time": "06:20" }, { "stop": "Chinthamani", "time": "06:25" },
          { "stop": "Skywalk", "time": "06:30" }, { "stop": "Choolaimadu", "time": "06:33" }, { "stop": "Loyola College", "time": "06:35" },
          { "stop": "T. Nagar", "time": "06:40" }, { "stop": "CIT Nagar", "time": "06:43" }, { "stop": "Saidapet", "time": "06:45" },
          { "stop": "Velachery Check Post", "time": "06:50" }, { "stop": "Vijaya Nagar Bus Stop", "time": "06:53" }, { "stop": "Baby Nagar", "time": "06:55" },
          { "stop": "Tharamani", "time": "07:00" }, { "stop": "MGR Road", "time": "07:15" }, { "stop": "OMR", "time": "07:20" },
          { "stop": "Ladies Hostel", "time": "07:35" }, { "stop": "M.S.A.J.C.E – College", "time": "08:00" }
        ]
      },
      {
        "route_no": "AR-6",
        "driver": { "name": "Mr. Venkatachalam", "mobile": "+91-9025731746" },
        "stops": [
          { "stop": "MMDA School", "time": "06:15" }, { "stop": "Anna Nagar", "time": "06:20" }, { "stop": "Chinthamani", "time": "06:25" },
          { "stop": "Skywalk", "time": "06:30" }, { "stop": "Choolaimadu", "time": "06:33" }, { "stop": "Loyola College", "time": "06:35" },
          { "stop": "T. Nagar", "time": "06:40" }, { "stop": "CIT Nagar", "time": "06:43" }, { "stop": "Saidapet", "time": "06:45" },
          { "stop": "Velachery Check Post", "time": "06:50" }, { "stop": "Vijaya Nagar Bus Stop", "time": "06:53" }, { "stop": "Baby Nagar", "time": "06:55" },
          { "stop": "Tharamani", "time": "07:00" }, { "stop": "MGR Road", "time": "07:15" }, { "stop": "OMR", "time": "07:20" },
          { "stop": "Ladies Hostel", "time": "07:35" }, { "stop": "M.S.A.J.C.E – College", "time": "08:00" }
        ]
      },
      {
        "route_no": "AR-7",
        "driver": { "name": "Mr. Suresh", "mobile": "+91-9789895025" },
        "stops": [
          { "stop": "Chunambedu", "time": "05:25" }, { "stop": "Kadapakkam", "time": "05:45" }, { "stop": "Elliyamman Koil", "time": "06:00" },
          { "stop": "Koovathur", "time": "06:17" }, { "stop": "Kathan Kadai", "time": "06:22" }, { "stop": "Kalpakkam", "time": "06:30" },
          { "stop": "Caturankappattinam", "time": "06:40" }, { "stop": "Venkampakkam", "time": "06:50" }, { "stop": "Thirukazukundram", "time": "07:00" },
          { "stop": "Punceri", "time": "07:12" }, { "stop": "Paiyanur", "time": "07:15" }, { "stop": "Alathur", "time": "07:20" },
          { "stop": "Thirupporur", "time": "07:30" }, { "stop": "Kalavakkam", "time": "07:36" }, { "stop": "Cenkanmal", "time": "07:41" },
          { "stop": "Kelambakkam", "time": "07:45" }, { "stop": "Padur", "time": "07:50" }, { "stop": "Aananth College", "time": "07:53" },
          { "stop": "M.S.A.J.C.E – College", "time": "08:00" }
        ]
      },
      {
        "route_no": "AR-8",
        "driver": { "name": "Mr. Raju", "mobile": "+91-9790750906" },
        "stops": [
          { "stop": "Manjambakkam", "time": "05:50" }, { "stop": "Retteri", "time": "05:55" }, { "stop": "Senthil Nagar", "time": "06:00" },
          { "stop": "Padi", "time": "06:05" }, { "stop": "Anna Nagar", "time": "06:10" }, { "stop": "Thirumangalam", "time": "06:12" },
          { "stop": "Vijaykanth", "time": "06:15" }, { "stop": "CMBT", "time": "06:20" }, { "stop": "Vadapalani", "time": "06:25" },
          { "stop": "Ashok Pillar", "time": "06:30" }, { "stop": "Kasi Theatre", "time": "06:35" }, { "stop": "Ekkattuthangal", "time": "06:40" },
          { "stop": "Aadampakkam", "time": "06:50" }, { "stop": "Kaiveli", "time": "06:55" }, { "stop": "Pallikaranai", "time": "07:10" },
          { "stop": "Medavakkam", "time": "07:20" }, { "stop": "Perumpakkam", "time": "07:25" }, { "stop": "Sholinganallur", "time": "07:30" },
          { "stop": "Ladies Hostel", "time": "07:35" }, { "stop": "M.S.A.J.C.E – College", "time": "08:00" }
        ]
      },
      {
        "route_no": "AR-9",
        "driver": { "name": "Mr. Kanagaraj", "mobile": "+91-9710209097" },
        "stops": [
          { "stop": "Ennore", "time": "06:15" }, { "stop": "Mint", "time": "06:20" }, { "stop": "Broadway", "time": "06:25" },
          { "stop": "Central", "time": "06:30" }, { "stop": "Omandhoorar Hospital", "time": "06:40" }, { "stop": "Royapettah", "time": "06:45" },
          { "stop": "Mylapore", "time": "06:50" }, { "stop": "Santhome", "time": "07:00" }, { "stop": "Adyar", "time": "07:10" },
          { "stop": "Thiruvanmiyur", "time": "07:15" }, { "stop": "Palavakkam", "time": "07:20" }, { "stop": "Neelankarai", "time": "07:25" },
          { "stop": "Akkarai Water Tank", "time": "07:30" }, { "stop": "Sholinganallur", "time": "07:35" }, { "stop": "Ladies Hostel", "time": "07:40" },
          { "stop": "M.S.A.J.C.E – College", "time": "08:00" }
        ]
      },
      {
        "route_no": "R-20",
        "driver": { "name": "Mr. M. Suresh", "mobile": "+91-9849265637" },
        "stops": [
          { "stop": "Moolakadai", "time": "05:55" }, { "stop": "Perambur Railway", "time": "06:10" }, { "stop": "Otteri Pattalam", "time": "06:15" },
          { "stop": "Dowton", "time": "06:20" }, { "stop": "Central", "time": "06:25" }, { "stop": "Parrys", "time": "06:30" },
          { "stop": "Omandhoorar Hospital", "time": "06:40" }, { "stop": "Royapettah", "time": "06:45" }, { "stop": "Mylapore", "time": "06:50" },
          { "stop": "Santhome", "time": "07:00" }, { "stop": "Adyar", "time": "07:05" }, { "stop": "Thiruvanmiyur", "time": "07:10" },
          { "stop": "Palavakkam", "time": "07:15" }, { "stop": "Neelankarai", "time": "07:20" }, { "stop": "Akkarai Water Tank", "time": "07:25" },
          { "stop": "Sholinganallur", "time": "07:30" }, { "stop": "Ladies Hostel", "time": "07:35" }, { "stop": "M.S.A.J.C.E – College", "time": "08:00" }
        ]
      },
      {
        "route_no": "R-21",
        "driver": { "name": "Mr. E. Sathish", "mobile": "+91-9677007583" },
        "stops": [
          { "stop": "Porur", "time": "06:25" }, { "stop": "Boy Kadai", "time": "06:33" }, { "stop": "Kovoor", "time": "06:35" },
          { "stop": "Kundrathur", "time": "06:38" }, { "stop": "Anagaputhur", "time": "06:40" }, { "stop": "Pammal", "time": "06:43" },
          { "stop": "Pallavaram", "time": "06:45" }, { "stop": "Meenambakkam", "time": "06:48" }, { "stop": "Pallavaram", "time": "06:50" },
          { "stop": "Chrompet", "time": "06:55" }, { "stop": "Tambaram W & E", "time": "07:00" }, { "stop": "Camp Road", "time": "07:05" },
          { "stop": "Saliyur", "time": "07:10" }, { "stop": "Medavakkam", "time": "07:25" }, { "stop": "Chithalapakkam", "time": "07:30" },
          { "stop": "Thalambur", "time": "07:35" }, { "stop": "M.S.A.J.C.E – College", "time": "08:00" }
        ]
      },
      {
        "route_no": "R-22",
        "driver": { "name": "Mr. Jaffar", "mobile": "+91-9566037890" },
        "stops": [
          { "stop": "Nemilichery", "time": "05:50" }, { "stop": "Poonamallee", "time": "06:05" }, { "stop": "Kumanan Chavadi", "time": "06:00" },
          { "stop": "Kattupakkam", "time": "06:05" }, { "stop": "Ramachandra Hospital", "time": "06:10" }, { "stop": "Porur", "time": "06:15" },
          { "stop": "Valasaravakkam", "time": "06:20" }, { "stop": "Ramapuram", "time": "06:25" }, { "stop": "Nandhampakkam", "time": "06:30" },
          { "stop": "Kathipara Junction", "time": "06:35" }, { "stop": "Thillai Ganga Subway", "time": "06:40" }, { "stop": "Velachery Bypass", "time": "06:45" },
          { "stop": "Kaiveli", "time": "07:00" }, { "stop": "Madipakkam", "time": "07:05" }, { "stop": "Kilkattalai", "time": "07:10" },
          { "stop": "Kovilambakkam", "time": "07:15" }, { "stop": "Medavakkam", "time": "07:20" }, { "stop": "Sholinganallur", "time": "07:25" },
          { "stop": "M.S.A.J.C.E – College", "time": "08:00" }
        ]
      }
    ]
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
  const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);

  console.log("Ingesting MTC Public Transport...");
  for (const r of transportData.public_transport_mtc.routes) {
    const content = `Public MTC Bus Route ${r.routeNo} connects ${r.start} to ${r.end} via ${r.via}. This bus stops at ${transportData.public_transport_mtc.stop_name} and runs ${r.freq}.`;
    const embedding = await generateEmbedding(content);
    await col.insertOne({
      source: "verified_mtc", category: "transport", title: `MTC Route ${r.routeNo}`,
      content, text: content, embedding,
      metadata: { route: r.routeNo, type: "MTC", created_at: new Date().toISOString() }
    });
  }

  console.log("Ingesting College Buses Detailed...");
  for (const r of transportData.college_buses) {
    const stopList = r.stops.map(s => `${s.stop} (${s.time})`).join(" → ");
    const content = `MSAJCE College Bus Route ${r.route_no}. Driver: ${r.driver.name} (${r.driver.mobile}). Full Route: ${stopList}. The bus arrives at college at 08:00 AM.`;
    
    process.stdout.write(`Processing ${r.route_no}...\r`);
    const embedding = await generateEmbedding(content);

    await col.insertOne({
      source: "verified_transport", category: "transport", title: `Bus Route ${r.route_no}`,
      content, text: content, embedding,
      metadata: { route: r.route_no, driver: r.driver.name, phone: r.driver.mobile, stops_count: r.stops.length, created_at: new Date().toISOString() }
    });

    for (const s of r.stops) {
        const stopFact = `MSAJCE Bus ${r.route_no} stops at ${s.stop} at ${s.time} AM. The driver is ${r.driver.name} (${r.driver.mobile}).`;
        const stopEmbedding = await generateEmbedding(stopFact);
        await col.insertOne({
            source: "verified_transport_stop", category: "transport", title: `${r.route_no} Stop: ${s.stop}`,
            content: stopFact, text: stopFact, embedding: stopEmbedding,
            metadata: { route: r.route_no, stop: s.stop, time: s.time, type: "individual_stop" }
        });
    }
  }

  console.log("\n✅ Master Transport Ingestion Complete!");
  process.exit(0);
}

run();
