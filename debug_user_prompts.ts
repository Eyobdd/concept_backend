import { MongoClient } from "npm:mongodb";
import "jsr:@std/dotenv/load";

const MONGO_URI = Deno.env.get("MONGODB_URL") || "";
const DB_NAME = Deno.env.get("DB_NAME") || "Zien";
const TARGET_USER = "019a5858-78bd-7e7a-8d56-9ac74ac58b3c";

const client = new MongoClient(MONGO_URI, { maxPoolSize: 5 });

try {
  await client.connect();
  const db = client.db(DB_NAME);
  
  console.log(`🔍 Debugging prompts for user: ${TARGET_USER}\n`);
  
  // Raw query
  const prompts = await db.collection("promptTemplates").find({ user: TARGET_USER }).toArray();
  console.log(`📝 Found ${prompts.length} prompts (raw query):`);
  prompts.forEach((p: any, i: number) => {
    console.log(`\n${i + 1}. Prompt:`);
    console.log(`   _id: ${p._id}`);
    console.log(`   user: ${p.user}`);
    console.log(`   promptText: "${p.promptText}"`);
    console.log(`   position: ${p.position}`);
    console.log(`   isActive: ${p.isActive}`);
    console.log(`   Full document:`, JSON.stringify(p, null, 2));
  });
  
  // Check if there are ANY prompts in the collection
  const allPrompts = await db.collection("promptTemplates").find({}).toArray();
  console.log(`\n\n📊 Total prompts in database: ${allPrompts.length}`);
  if (allPrompts.length > 0) {
    console.log("\nAll prompts:");
    allPrompts.forEach((p: any) => {
      console.log(`  - User: ${p.user}, Text: "${p.promptText?.substring(0, 30)}..."`);
    });
  }
  
  // Check users
  const users = await db.collection("users").find({}).toArray();
  console.log(`\n\n👥 Total users: ${users.length}`);
  users.forEach((u: any) => {
    console.log(`  - ${u._id} (phone: ${u.phone})`);
  });
  
  // Solution
  if (prompts.length > 0 && prompts.every((p: any) => !p.promptText || p.promptText === "")) {
    console.log("\n\n❌ ISSUE FOUND: Prompts exist but have empty promptText!");
    console.log("💡 SOLUTION: Delete corrupt prompts and recreate:");
    console.log(`   db.promptTemplates.deleteMany({ user: "${TARGET_USER}" })`);
  } else if (prompts.length === 0) {
    console.log("\n\n✅ No prompts found - createDefaultPrompts check is wrong!");
    console.log("   The backend thinks prompts exist but they don't.");
    console.log("   This might be a caching issue or race condition.");
  }
  
} catch (error) {
  console.error("❌ Error:", error);
} finally {
  await client.close();
}
