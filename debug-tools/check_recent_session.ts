import { MongoClient } from "npm:mongodb";
import "jsr:@std/dotenv/load";

const MONGO_URI = Deno.env.get("MONGODB_URL") || "mongodb://localhost:27017";
const DB_NAME = Deno.env.get("DB_NAME") || "Zien";

const client = new MongoClient(MONGO_URI);

try {
  await client.connect();
  console.log("Connected to MongoDB\n");
  
  const db = client.db(DB_NAME);
  
  // Check recent reflection sessions
  const sessionsCollection = db.collection("ReflectionSession.reflectionSessions");
  const sessions = await sessionsCollection.find({}).sort({ startedAt: -1 }).limit(3).toArray();
  
  console.log(`Latest reflection sessions:`);
  for (const session of sessions) {
    console.log(`  - Session ID: ${session._id}`);
    console.log(`    User: ${session.user}`);
    console.log(`    CallSession: ${session.callSession}`);
    console.log(`    Status: ${session.status}`);
    console.log(`    Method: ${session.method}`);
    console.log(`    Started: ${session.startedAt}`);
    console.log();
  }
  
  // Check recent phone calls
  const phoneCallsCollection = db.collection("PhoneCall.phoneCalls");
  const phoneCalls = await phoneCallsCollection.find({}).sort({ initiatedAt: -1 }).limit(3).toArray();
  
  console.log(`Latest phone calls:`);
  for (const call of phoneCalls) {
    console.log(`  - Call ID: ${call._id}`);
    console.log(`    User: ${call.user}`);
    console.log(`    ReflectionSession: ${call.reflectionSession}`);
    console.log(`    TwilioCallSid: ${call.twilioCallSid}`);
    console.log(`    Status: ${call.status}`);
    console.log();
  }
  
} catch (error) {
  console.error("Error:", error);
} finally {
  await client.close();
  console.log("Disconnected from MongoDB");
}
