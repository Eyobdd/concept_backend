// This import loads the `.env` file as environment variables
import "jsr:@std/dotenv/load";
import { Db, MongoClient, type MongoClientOptions } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { generate } from "jsr:@std/uuid/unstable-v7";

// Singleton instances - shared across entire application
let sharedClient: MongoClient | null = null;
let sharedDb: Db | null = null;

const DEFAULT_CA_PATHS = [
  "/etc/ssl/certs/ca-certificates.crt",
  "/etc/ssl/cert.pem",
  "/etc/pki/tls/certs/ca-bundle.crt",
];

function parseBoolean(value: string | undefined, defaultValue: boolean) {
  if (value === undefined) {
    return defaultValue;
  }
  const normalized = value.trim().toLowerCase();
  return ["true", "1", "yes", "on"].includes(normalized);
}

async function resolveTlsCAFile(): Promise<string | null> {
  const envPath = Deno.env.get("MONGODB_TLS_CA_FILE");
  const candidatePaths = envPath
    ? [envPath, ...DEFAULT_CA_PATHS]
    : DEFAULT_CA_PATHS;

  for (const path of candidatePaths) {
    try {
      const stat = await Deno.stat(path);
      if (stat.isFile) {
        return path;
      }
    } catch (_error) {
      // Ignore errors for missing files; we'll try the next candidate.
    }
  }

  return null;
}

async function initMongoClient() {
  const DB_CONN = Deno.env.get("MONGODB_URL");
  if (DB_CONN === undefined) {
    throw new Error("Could not find environment variable: MONGODB_URL");
  }

  const allowInvalidCertificates = parseBoolean(
    Deno.env.get("MONGODB_ALLOW_INVALID_CERTS"),
    false,
  );
  const allowInvalidHostnames = parseBoolean(
    Deno.env.get("MONGODB_ALLOW_INVALID_HOSTNAMES"),
    allowInvalidCertificates,
  );

  const clientOptions: MongoClientOptions = {
    maxPoolSize: 10, // Max 10 connections per client (reduced from default 100)
    minPoolSize: 2, // Keep 2 connections ready
    maxIdleTimeMS: 30000, // Close idle connections after 30s
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    tls: true, // Force TLS/SSL
    tlsAllowInvalidCertificates: allowInvalidCertificates,
    tlsAllowInvalidHostnames: allowInvalidHostnames,
  };

  if (!allowInvalidCertificates) {
    const caFile = await resolveTlsCAFile();
    if (caFile) {
      clientOptions.tlsCAFile = caFile;
      console.log(`[MongoDB] Using TLS CA file: ${caFile}`);
    } else {
      console.warn(
        "[MongoDB] No TLS CA file found; relying on default certificate store",
      );
    }
  }

  // Configure connection pool to prevent connection exhaustion
  // TLS configuration added for Deno compatibility with MongoDB Atlas
  const client = new MongoClient(DB_CONN, clientOptions);

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
