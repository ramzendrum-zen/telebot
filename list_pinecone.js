import { Pinecone } from '@pinecone-database/pinecone';

const pc = new Pinecone({
  apiKey: "pcsk_28r4Ge_BmSFxpNJk26WKRNU5M4UvXp6AP8MgJaSFtuBqdY8sfZTaXZHa39S1bkz9xGbg6X"
});

async function run() {
  try {
    const indexes = await pc.listIndexes();
    console.log("Indexes:", indexes);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
