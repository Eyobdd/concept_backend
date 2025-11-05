import { MongoClient } from "npm:mongodb";
import "jsr:@std/dotenv/load";

const MONGO_URI = Deno.env.get("MONGODB_URL") || "mongodb://localhost:27017";
const DB_NAME = Deno.env.get("DB_NAME") || "Zien";

const client = new MongoClient(MONGO_URI);

try {
  await client.connect();
  console.log("Connected to MongoDB\n");
  
  const db = client.db(DB_NAME);
  
  // Clean up profiles with null user
  const profilesCollection = db.collection("Profile.profiles");
  const nullProfiles = await profilesCollection.find({ user: null }).toArray();
  
  console.log(`Found ${nullProfiles.length} profiles with null user:`);
  for (const profile of nullProfiles) {
    console.log(`  - Profile ID: ${profile._id}`);
    console.log(`    Phone: ${profile.phoneNumber}`);
    console.log(`    Display Name: ${profile.displayName}`);
  }
  
  if (nullProfiles.length > 0) {
    console.log("\nDeleting profiles with null user...");
    const result = await profilesCollection.deleteMany({ user: null });
    console.log(`✅ Deleted ${result.deletedCount} profiles`);
  }
  
  // Clean up any remaining IN_PROGRESS sessions
  const sessionsCollection = db.collection("ReflectionSession.reflectionSessions");
  const inProgressSessions = await sessionsCollection.find({ status: "IN_PROGRESS" }).toArray();
  
  console.log(`\nFound ${inProgressSessions.length} IN_PROGRESS sessions`);
  if (inProgressSessions.length > 0) {
    const result = await sessionsCollection.updateMany(
      { status: "IN_PROGRESS" },
      { $set: { status: "ABANDONED", endedAt: new Date() } }
    );
    console.log(`✅ Abandoned ${result.modifiedCount} sessions`);
  }
  
} catch (error) {
  console.error("Error:", error);
} finally {
  await client.close();
  console.log("\nDisconnected from MongoDB");
}
