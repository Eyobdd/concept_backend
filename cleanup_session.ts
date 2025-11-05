import { MongoClient } from "npm:mongodb";
import "jsr:@std/dotenv/load";

const MONGO_URI = Deno.env.get("MONGODB_URL") || "mongodb://localhost:27017";
const DB_NAME = Deno.env.get("DB_NAME") || "Zien";

console.log(`Using MongoDB: ${MONGO_URI.substring(0, 30)}...`);
console.log(`Database: ${DB_NAME}`);

const client = new MongoClient(MONGO_URI);

try {
  await client.connect();
  console.log("Connected to MongoDB");
  
  const db = client.db(DB_NAME);
  const sessionsCollection = db.collection("ReflectionSession.reflectionSessions");
  
  // Find all IN_PROGRESS sessions
  const inProgressSessions = await sessionsCollection.find({ status: "IN_PROGRESS" }).toArray();
  
  console.log(`\nFound ${inProgressSessions.length} IN_PROGRESS sessions:`);
  for (const session of inProgressSessions) {
    console.log(`  - Session ID: ${session._id}`);
    console.log(`    User: ${session.user}`);
    console.log(`    Started: ${session.startedAt}`);
    console.log(`    Method: ${session.method}`);
  }
  
  if (inProgressSessions.length > 0) {
    console.log("\nAbandoning all IN_PROGRESS sessions...");
    const result = await sessionsCollection.updateMany(
      { status: "IN_PROGRESS" },
      { $set: { status: "ABANDONED", endedAt: new Date() } }
    );
    console.log(`✅ Updated ${result.modifiedCount} sessions to ABANDONED`);
  }
  
} catch (error) {
  console.error("Error:", error);
} finally {
  await client.close();
  console.log("\nDisconnected from MongoDB");
}
