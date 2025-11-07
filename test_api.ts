import { MongoClient } from "npm:mongodb";
import "jsr:@std/dotenv/load";

const MONGO_URI = Deno.env.get("MONGODB_URL") || "";
const DB_NAME = Deno.env.get("DB_NAME") || "Zien";

console.log("🔍 Testing API and Database Access\n");

const client = new MongoClient(MONGO_URI, {
  maxPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
});

try {
  await client.connect();
  console.log("✅ MongoDB connected");
  
  const db = client.db(DB_NAME);
  
  // Check journal entry
  console.log("\n📖 Checking Journal Entry for 2025-11-06:");
  const entry = await db.collection("journalEntries").findOne({
    creationDate: "2025-11-06"
  });
  
  if (entry) {
    console.log("✅ Found entry:", {
      _id: entry._id,
      user: entry.user,
      creationDate: entry.creationDate,
      rating: entry.rating,
    });
    
    // Check responses
    console.log("\n💬 Checking Prompt Responses:");
    const responses = await db.collection("promptResponses").find({
      entry: entry._id
    }).toArray();
    
    console.log(`✅ Found ${responses.length} responses`);
    responses.forEach((r: any, i: number) => {
      console.log(`  ${i + 1}. ${r.promptText?.substring(0, 50)}...`);
      console.log(`     Response: ${r.responseText?.substring(0, 50)}...`);
    });
  } else {
    console.log("❌ No entry found for 2025-11-06");
  }
  
  // Check user authentication
  console.log("\n👤 Checking User:");
  const user = await db.collection("users").findOne({
    _id: entry?.user
  });
  
  if (user) {
    console.log("✅ Found user:", {
      _id: user._id,
      phone: user.phone,
    });
    
    // Check session
    console.log("\n🔐 Checking Session:");
    const session = await db.collection("sessions").findOne({
      user: user._id
    });
    
    if (session) {
      console.log("✅ Found session:", {
        _id: session._id,
        user: session.user,
      });
      console.log("\n🎫 Use this token for API calls:");
      console.log(session._id);
    } else {
      console.log("❌ No session found");
    }
  } else {
    console.log("❌ User not found");
  }
  
  // Test API endpoint
  console.log("\n🌐 Testing API Endpoint:");
  if (entry && user) {
    const session = await db.collection("sessions").findOne({ user: user._id });
    if (session) {
      const response = await fetch("http://localhost:8000/api/JournalEntry/_getEntryByDate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: session._id,
          date: "2025-11-06"
        })
      });
      
      const data = await response.json();
      console.log("✅ API Response:", data);
    }
  }
  
} catch (error) {
  console.error("❌ Error:", error);
} finally {
  await client.close();
  console.log("\n✅ Test complete");
}
