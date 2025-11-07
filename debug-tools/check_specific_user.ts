import { MongoClient } from "npm:mongodb";
import "jsr:@std/dotenv/load";

const MONGO_URI = Deno.env.get("MONGODB_URL") || "";
const DB_NAME = Deno.env.get("DB_NAME") || "Zien";
const USER_ID = "019a585c-fbb6-78e5-843c-2e539b02d77b";

const client = new MongoClient(MONGO_URI, { maxPoolSize: 5 });

try {
  await client.connect();
  const db = client.db(DB_NAME);
  
  console.log(`Checking user: ${USER_ID}\n`);
  
  const prompts = await db.collection("promptTemplates").find({ user: USER_ID }).toArray();
  console.log(`Prompts: ${prompts.length}`);
  prompts.forEach((p: any) => console.log(`  - ${p.promptText} (position: ${p.position})`));
  
  const user = await db.collection("users").findOne({ _id: USER_ID });
  console.log(`\nUser exists: ${user ? 'YES' : 'NO'}`);
  if (user) console.log(`  Phone: ${user.phone}`);
  
  const session = await db.collection("sessions").findOne({ _id: "36aa26cb-9c91-4434-9250-f38570a95d7b" });
  console.log(`\nSession exists: ${session ? 'YES' : 'NO'}`);
  if (session) console.log(`  User: ${session.user}`);
  
} catch (error) {
  console.error("Error:", error);
} finally {
  await client.close();
}
