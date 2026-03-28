import { Pinecone } from '@pinecone-database/pinecone';

const pc = new Pinecone({
  apiKey: "pcsk_28r4Ge_BmSFxpNJk26WKRNU5M4UvXp6AP8MgJaSFtuBqdY8sfZTaXZHa39S1bkz9xGbg6X"
});

async function run() {
  try {
    const index = pc.index("n8n768");
    console.log("Deleting all records from n8n768...");
    await index.deleteAll();
    console.log("Delete command sent successfully.");
    
    // Check stats again to see if it worked
    const stats = await index.describeIndexStats();
    console.log("Current Stats:", stats);
  } catch (err) {
    console.error("Error encountered:", err);
  }
}

run();
