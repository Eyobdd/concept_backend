// This import loads the `.env` file as environment variables
import "jsr:@std/dotenv/load";
import { Db, MongoClient } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { generate } from "jsr:@std/uuid/unstable-v7";

// Singleton instances - shared across entire application
let sharedClient: MongoClient | null = null;
let sharedDb: Db | null = null;

async function initMongoClient() {
  const DB_CONN = Deno.env.get("MONGODB_URL");
  if (DB_CONN === undefined) {
    throw new Error("Could not find environment variable: MONGODB_URL");
  }
  
  // Configure connection pool to prevent connection exhaustion
  const client = new MongoClient(DB_CONN, {
    maxPoolSize: 10,              // Max 10 connections per client (reduced from default 100)
    minPoolSize: 2,               // Keep 2 connections ready
    maxIdleTimeMS: 30000,         // Close idle connections after 30s
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  
  try {
    await client.connect();
    console.log("[MongoDB] Connected successfully with connection pooling (maxPoolSize: 10)");
  } catch (e) {
    throw new Error("MongoDB connection failed: " + e);
  }
  return client;
}

async function init() {
  // Return existing singleton if already initialized
  if (sharedClient && sharedDb) {
    console.log("[MongoDB] Reusing existing connection (singleton pattern)");
    return [sharedClient, sharedDb.databaseName] as [MongoClient, string];
  }
  
  // Initialize new connection
  const client = await initMongoClient();
  const DB_NAME = Deno.env.get("DB_NAME");
  if (DB_NAME === undefined) {
    throw new Error("Could not find environment variable: DB_NAME");
  }
  
  // Store singleton instances
  sharedClient = client;
  sharedDb = client.db(DB_NAME);
  
  return [client, DB_NAME] as [MongoClient, string];
}

async function dropAllCollections(db: Db): Promise<void> {
  try {
    // Get all collection names
    const collections = await db.listCollections().toArray();

    // Drop each collection
    for (const collection of collections) {
      await db.collection(collection.name).drop();
    }
  } catch (error) {
    console.error("Error dropping collections:", error);
    throw error;
  }
}

/**
 * MongoDB database configured by .env (singleton pattern).
 * Returns the shared database instance and client.
 * All calls reuse the same connection to prevent connection exhaustion.
 * @returns {[Db, MongoClient]} initialized database and client
 */
export async function getDb() {
  await init(); // Ensures singleton is initialized
  if (!sharedDb || !sharedClient) {
    throw new Error("Database initialization failed");
  }
  return [sharedDb, sharedClient];
}

/**
 * Test database initialization
 * @returns {[Db, MongoClient]} initialized test database and client
 */
export async function testDb() {
  const [client, DB_NAME] = await init();
  const test_DB_NAME = `test-${DB_NAME}`;
  const test_Db = client.db(test_DB_NAME);
  await dropAllCollections(test_Db);
  return [test_Db, client] as [Db, MongoClient];
}

/**
 * Close the shared MongoDB connection gracefully.
 * Should be called on application shutdown.
 */
export async function closeDb(): Promise<void> {
  if (sharedClient) {
    await sharedClient.close();
    console.log("[MongoDB] Connection closed gracefully");
    sharedClient = null;
    sharedDb = null;
  }
}

/**
 * Creates a fresh ID.
 * @returns {ID} UUID v7 generic ID.
 */
export function freshID() {
  return generate() as ID;
}
