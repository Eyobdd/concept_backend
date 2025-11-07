import { MongoClient } from "npm:mongodb";
import "jsr:@std/dotenv/load";

const MONGO_URI = Deno.env.get("MONGODB_URL") || "mongodb://localhost:27017";
const DB_NAME = Deno.env.get("DB_NAME") || "Zien";

const client = new MongoClient(MONGO_URI);

try {
  await client.connect();
  console.log("Connected to MongoDB\n");
  
  const db = client.db(DB_NAME);
  
  // Check profiles
  const profilesCollection = db.collection("Profile.profiles");
  const profiles = await profilesCollection.find({}).sort({ updatedAt: -1 }).limit(3).toArray();
  
  console.log(`Latest profiles:`);
  for (const profile of profiles) {
    console.log(`  - Profile ID: ${profile._id}`);
    console.log(`    User: ${profile.user}`);
    console.log(`    Display Name: ${profile.displayName}`);
    console.log(`    Phone: ${profile.phoneNumber}`);
    console.log(`    Updated: ${profile.updatedAt}`);
    console.log();
  }
  
} catch (error) {
  console.error("Error:", error);
} finally {
  await client.close();
  console.log("Disconnected from MongoDB");
}
