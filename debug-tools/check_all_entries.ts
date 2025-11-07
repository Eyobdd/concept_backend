import { MongoClient } from "npm:mongodb";
import "jsr:@std/dotenv/load";

const MONGO_URI = Deno.env.get("MONGODB_URL") || "";
const DB_NAME = Deno.env.get("DB_NAME") || "Zien";

const client = new MongoClient(MONGO_URI, { maxPoolSize: 5 });

try {
  await client.connect();
  const db = client.db(DB_NAME);
  
  console.log("📖 All Journal Entries:");
  const entries = await db.collection("journalEntries").find({}).sort({ creationDate: -1 }).toArray();
  
  if (entries.length === 0) {
    console.log("❌ No journal entries found");
  } else {
    console.log(`✅ Found ${entries.length} entries:\n`);
    entries.forEach((entry: any) => {
      console.log(`Entry ID: ${entry._id}`);
      console.log(`  User: ${entry.user}`);
      console.log(`  Date: ${entry.creationDate}`);
      console.log(`  Rating: ${entry.rating}`);
      console.log(`  Session: ${entry.reflectionSession}`);
      console.log("");
    });
  }
  
  console.log("\n🔄 All Reflection Sessions:");
  const sessions = await db.collection("reflectionSessions").find({}).sort({ startedAt: -1 }).limit(5).toArray();
  
  if (sessions.length === 0) {
    console.log("❌ No reflection sessions found");
  } else {
    console.log(`✅ Found ${sessions.length} recent sessions:\n`);
    sessions.forEach((session: any) => {
      console.log(`Session ID: ${session._id}`);
      console.log(`  User: ${session.user}`);
      console.log(`  Status: ${session.status}`);
      console.log(`  Method: ${session.method}`);
      console.log(`  Started: ${session.startedAt}`);
      console.log(`  Ended: ${session.endedAt || 'N/A'}`);
      console.log(`  Prompts: ${session.prompts?.length || 0}`);
      console.log("");
    });
  }
  
  console.log("\n💬 All Prompt Responses:");
  const responses = await db.collection("promptResponses").find({}).sort({ responseFinished: -1 }).limit(10).toArray();
  
  if (responses.length === 0) {
    console.log("❌ No prompt responses found");
  } else {
    console.log(`✅ Found ${responses.length} recent responses:\n`);
    responses.forEach((response: any) => {
      console.log(`Response ID: ${response._id}`);
      console.log(`  Session: ${response.session}`);
      console.log(`  Entry: ${response.entry || 'N/A'}`);
      console.log(`  Prompt: ${response.promptText?.substring(0, 50)}...`);
      console.log(`  Response: ${response.responseText?.substring(0, 50)}...`);
      console.log("");
    });
  }
  
} catch (error) {
  console.error("❌ Error:", error);
} finally {
  await client.close();
}
