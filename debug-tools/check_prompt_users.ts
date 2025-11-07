import { MongoClient } from "npm:mongodb";
import "jsr:@std/dotenv/load";

const MONGO_URI = Deno.env.get("MONGODB_URL") || "";
const DB_NAME = Deno.env.get("DB_NAME") || "Zien";

const client = new MongoClient(MONGO_URI, { maxPoolSize: 5 });

try {
  await client.connect();
  const db = client.db(DB_NAME);
  
  console.log("🔍 Checking Prompt Ownership\n");
  
  // Get all prompts
  const prompts = await db.collection("promptTemplates").find({}).toArray();
  console.log(`📝 Found ${prompts.length} prompts in database:`);
  prompts.forEach((p: any) => {
    console.log(`  - Prompt: "${p.promptText?.substring(0, 50)}..."`);
    console.log(`    User: ${p.user}`);
    console.log(`    Position: ${p.position}`);
    console.log(`    Active: ${p.isActive}`);
    console.log("");
  });
  
  // Get all users
  console.log("\n👥 All Users:");
  const users = await db.collection("users").find({}).toArray();
  console.log(`Found ${users.length} users:`);
  users.forEach((u: any) => {
    console.log(`  - User ID: ${u._id}`);
    console.log(`    Phone: ${u.phone}`);
    console.log("");
  });
  
  // Get all sessions (to find current user's token)
  console.log("\n🔐 Active Sessions:");
  const sessions = await db.collection("sessions").find({}).toArray();
  console.log(`Found ${sessions.length} sessions:`);
  sessions.forEach((s: any) => {
    console.log(`  - Session ID (token): ${s._id}`);
    console.log(`    User: ${s.user}`);
    console.log("");
  });
  
  // Check if logged-in user has prompts
  const loggedInUser = "019a584b-f96a-756b-8874-22d8532b7828";
  const userPrompts = await db.collection("promptTemplates").find({ user: loggedInUser }).toArray();
  console.log(`\n🎯 Prompts for logged-in user (${loggedInUser}):`);
  console.log(`   Found: ${userPrompts.length} prompts`);
  
  if (userPrompts.length === 0) {
    console.log("\n❌ ISSUE FOUND: Logged-in user has NO prompts!");
    console.log("   The prompts in the database belong to a different user.");
    console.log("\n💡 SOLUTION: Create default prompts for the logged-in user:");
    console.log(`   curl -X POST http://localhost:8000/api/JournalPrompt/createDefaultPrompts \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"token":"YOUR_SESSION_TOKEN"}'`);
  }
  
} catch (error) {
  console.error("❌ Error:", error);
} finally {
  await client.close();
}
