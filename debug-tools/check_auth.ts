import { MongoClient } from "npm:mongodb";
import "jsr:@std/dotenv/load";

const MONGO_URI = Deno.env.get("MONGODB_URL") || "mongodb://localhost:27017";
const DB_NAME = Deno.env.get("DB_NAME") || "Zien";

const client = new MongoClient(MONGO_URI);

try {
  await client.connect();
  console.log("Connected to MongoDB\n");
  
  const db = client.db(DB_NAME);
  
  // Check sessions
  const sessionsCollection = db.collection("UserAuthentication.sessions");
  const sessions = await sessionsCollection.find({}).toArray();
  
  console.log(`Found ${sessions.length} authentication sessions:`);
  for (const session of sessions) {
    console.log(`  - Token: ${session.token?.substring(0, 20)}...`);
    console.log(`    User: ${session.user}`);
    console.log(`    Created: ${session.createdAt}`);
    console.log(`    Expires: ${session.expiresAt}`);
    console.log(`    Expired: ${new Date(session.expiresAt) < new Date()}`);
    console.log();
  }
  
  // Check users
  const usersCollection = db.collection("User.users");
  const users = await usersCollection.find({}).toArray();
  
  console.log(`\nFound ${users.length} users:`);
  for (const user of users) {
    console.log(`  - ID: ${user._id}`);
    console.log(`    Phone: ${user.phoneNumber}`);
    console.log();
  }
  
} catch (error) {
  console.error("Error:", error);
} finally {
  await client.close();
  console.log("Disconnected from MongoDB");
}
