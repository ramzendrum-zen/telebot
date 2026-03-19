import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { generateEmbedding } from './services/embeddingService.js';
import config from './config/config.js';
import { collegeContext } from './collegeContext.js';

dotenv.config();

async function ingestMassive() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
  const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);

  console.log("Starting massive context ingestion...");

  const docs = [];

  // Helper to push a standardized document
  const addDoc = (id, cat, title, content, keywords = [], variations = []) => {
    docs.push({
      document_id: id,
      source: "verified_data",
      category: cat,
      title: title,
      content: content,
      text: content,
      keywords: Array.from(new Set([...keywords, cat, "msajce"])),
      query_variations: variations,
      embedding: null
    });
  };

  const {
    personal_profile,
    institution_overview,
    about,
    visionMission,
    history,
    groupOfInstitutions,
    principal,
    governingCouncil,
    faculty_and_staff_details,
    admissions_2025_2026,
    academics_and_skills,
    campus_infrastructure,
    transportation,
    placements_and_training,
    research_detailed,
    website_deep_dive
  } = collegeContext;

  // 1. Personal Profile
  if (personal_profile) {
    addDoc("admin_developer_profile", "admin", "Developer Profile: Ramanathan S", 
      `Developer: Ramanathan S (Ram). 2nd Year B.Tech IT at MSAJCE (2024-2028). Skills: Web Dev, n8n, Automation, AI Chatbots. Projects: Event Booking, SmartHostel, Unity Haunted Village. Current Focus: Germany MSc prep.`,
      ["ramanathan", "ram", "developer", "creator"]);
  }

  // 2. Institution Detail
  if (institution_overview) {
    addDoc("admin_institution_overview", "admin", "MSAJCE Institution Overview",
      `Mohamed Sathak A. J. College of Engineering (MSAJCE). Founded: 5th July 2001. Location: Siruseri IT Park, OMR. counselling code: 1301. Accreditation: NAAC A+, ISO 9001:2015. Website: msajce-edu.in.`,
      ["established", "location", "address", "website", "code"]);
  }

  // 3. Principal
  if (principal) {
    addDoc("admin_principal_detailed", "admin", "Principal Details",
      `Principal: Dr. K.S. Srinivasan Ph.D. Contact: principal@msajce-edu.in, 9150575066. Message: Committed to multi-dimensional education and infrastructure.`,
      ["principal", "head", "srinivasan"]);
  }

  // 4. Group Institutions
  if (groupOfInstitutions) {
    const listStr = [...groupOfInstitutions.kilakaraiAndRamanathapuram, ...groupOfInstitutions.chennai].join(", ");
    addDoc("admin_group_institutions", "admin", "Mohamed Sathak Group of Institutions",
      `The Mohamed Sathak Trust (founded 1973) manages 18 institutions including MSAJCE, Architecture, Nursing, Pharmacy, Physiotherapy, and Arts & Science colleges across Chennai and Kilakarai. Full list: ${listStr}`,
      ["trust", "institutions", "sathak group"]);
  }

  // 5. Admissions 2025-2026
  if (admissions_2025_2026) {
    const ug = admissions_2025_2026.undergraduate_programs.map(p => `${p.course} (Intake: ${p.total_intake})`).join(", ");
    addDoc("admin_admissions_ug", "admin", "UG Course Intake 2025-2026",
      `Undergraduate courses for 2025-2026 include: ${ug}. All courses are 4 years duration. TNEA Counselling code: 1301.`,
      ["courses", "intake", "seats", "ug"]);

    const scholarships = admissions_2025_2026.scholarships.map(s => `${s.name}: ${s.amount}`).join("; ");
    addDoc("admin_scholarships", "admin", "MSAJCE Scholarships",
      `Available scholarships: ${scholarships}. Agencies: AICTE (Pragati/Saksham), Ministry of Minority Affairs, MHRD.`,
      ["scholarship", "financial aid", "funding"]);
  }

  // 6. Transport Detailed
  if (transportation && transportation.transport_detailed_routes) {
    for (const route of transportation.transport_detailed_routes) {
      const stopsStr = route.stops.map(s => `${s.stop} (${s.time})`).join(" -> ");
      addDoc(`transport_detailed_${route.route_no.toLowerCase().replace(/[^a-z0-9]/g,'')}`, "transport", 
        `Bus Route ${route.route_no} Detailed Schedule`,
        `Route ${route.route_no}. Driver: ${route.driver.name} (${route.driver.mobile}). Stops: ${stopsStr}. Final Stop: College at 08:00 AM.`,
        [route.route_no, "bus", "stops", "driver"]);
    }
  }

  // 7. Research & Patents (Critical for academic rep)
  if (research_detailed && research_detailed.content.patents) {
    const patents = research_detailed.content.patents.published.slice(0, 10).map(p => p.title).join(" | ");
    addDoc("admin_research_patents", "admin", "MSAJCE Research Patents",
      `MSAJCE has a strong research culture. Key patents include: ${patents}. Research Cell Head: Dr. B. Janarthanan.`,
      ["research", "patent", "innovation", "janarthanan"]);
  }

  // 8. Website Deep Dive (Hostel/Library)
  if (website_deep_dive) {
    const lib = website_deep_dive.library.content.resources.stackCollectionDetails;
    addDoc("facility_library", "general", "MSAJCE Library Resources",
      `Library (Learning Centre): 8978 sq.ft. Volumes: ${lib.Volumes}, Titles: ${lib.Title}. Journals: 35 Printed, 1800+ International. Digital: DELNET, J-Gate, Koha.`,
      ["library", "books", "journals", "koha"]);

    const host = website_deep_dive.hostel.content.facilities;
    addDoc("facility_hostel", "general", "MSAJCE Hostel Infrastructure",
      `Boys Hostel (on-campus, 3 blocks, 239 rooms). Girls Hostel (Sholinganallur, 71 rooms, 10km away). Amenities: AC/Non-AC, WiFi, Gym, TV Hall. Dining: Veg & Non-Veg.`,
      ["hostel", "accommodation", "stay", "mess"]);

    const sports = website_deep_dive.sports.content.facilities.join(", ");
    addDoc("facility_sports", "general", "MSAJCE Sports Facilities",
      `Director: Dr. K.P. Santhosh Nathan. Facilities: ${sports}. Gym includes: Multi Gym, Leg Press, Spin Bike, etc.`,
      ["sports", "gym", "games", "santhosh nathan"]);
  }

  console.log(`Generated ${docs.length} core documents. Starting uploads...`);

  for (const doc of docs) {
    console.log(`Processing: ${doc.title}`);
    doc.embedding = await generateEmbedding(doc.text);
    await col.updateOne(
      { document_id: doc.document_id },
      { $set: doc },
      { upsert: true }
    );
  }

  console.log("Massive ingestion complete!");
  process.exit(0);
}

ingestMassive().catch(console.error);
