# MongoDB Connection Pool Exhaustion Issue

## Problem
You're experiencing **over 500 MongoDB connections** to your cluster, causing:
- "An error occurred while querying your MongoDB deployment" errors
- Database timeouts and connection failures
- Frontend unable to fetch completed journal entries

## Root Causes

### 1. Multiple Processes Creating Connections
Your `start-all.sh` script starts **3 separate processes**, each creating its own MongoDB connection:
```bash
deno run --allow-all src/concept_server.ts &
deno run --allow-all src/workers/callSchedulerWorker.ts &
deno run --allow-all src/workers/callWindowScheduler.ts &
```

Each process calls `getDb()` which creates a new `MongoClient` connection.

### 2. No Connection Pooling Configuration
The MongoDB client in `/src/utils/database.ts` doesn't specify connection pool limits:
```typescript
const client = new MongoClient(DB_CONN);
```

By default, MongoDB driver creates up to 100 connections per client. With 3 processes × 100 connections = **300 connections minimum**.

### 3. Connections Never Closed on Restart
When you restart the server with `pkill -9 deno`, the processes are killed but:
- MongoDB connections are not gracefully closed
- Connections remain open on MongoDB Atlas side
- Each restart adds more orphaned connections

### 4. Multiple Restarts Accumulate
If you restarted 5+ times during development:
- 5 restarts × 3 processes × 100 connections = **1,500 potential connections**

## Immediate Fix

### Step 1: Kill All Processes
```bash
pkill -9 deno
pkill -9 node
```

### Step 2: Wait for MongoDB to Clean Up
MongoDB Atlas will eventually close idle connections (usually 10-30 minutes). You can:
- Wait for connections to timeout naturally
- Restart your MongoDB cluster (if you have that option)
- Contact MongoDB support to force-close connections

### Step 3: Add Connection Pool Limits
Update `/src/utils/database.ts`:

```typescript
async function initMongoClient() {
  const DB_CONN = Deno.env.get("MONGODB_URL");
  if (DB_CONN === undefined) {
    throw new Error("Could not find environment variable: MONGODB_URL");
  }
  
  // Add connection pool limits
  const client = new MongoClient(DB_CONN, {
    maxPoolSize: 10,        // Max 10 connections per client
    minPoolSize: 2,         // Keep 2 connections ready
    maxIdleTimeMS: 30000,   // Close idle connections after 30s
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  
  try {
    await client.connect();
  } catch (e) {
    console.error("Failed to connect to MongoDB:", e);
    throw e;
  }
  return client;
}
```

### Step 4: Reuse Single Database Connection
Instead of each worker creating its own connection, share one connection. Update `src/main.ts`:

```typescript
// Create ONE database connection
const [db, client] = await getDb();

// Pass the SAME db instance to all workers
const callSchedulerWorker = new CallSchedulerWorker(db, { ... });
const callWindowScheduler = new CallWindowScheduler(db, { ... });

// Graceful shutdown handler
Deno.addSignalListener("SIGINT", async () => {
  console.log("[Main] Shutting down gracefully...");
  callSchedulerWorker.stop();
  callWindowScheduler.stop();
  await client.close();
  Deno.exit(0);
});
```

### Step 5: Update start-all.sh
Only start the main server (which now includes all workers):

```bash
#!/bin/bash

# Kill any existing processes
pkill -9 deno 2>/dev/null
pkill -9 node 2>/dev/null

echo "Starting Zien backend server..."

# Start main server (includes all workers)
deno run --allow-all src/concept_server.ts &

# Open logs
./open-logs.sh

echo "✅ Server started!"
```

## Long-Term Best Practices

### 1. Connection Monitoring
Add logging to track connection usage:
```typescript
const client = new MongoClient(DB_CONN, { maxPoolSize: 10 });
await client.connect();

// Log connection stats periodically
setInterval(() => {
  const stats = client.topology?.s?.pool?.totalConnectionCount;
  console.log(`[MongoDB] Active connections: ${stats}`);
}, 60000); // Every minute
```

### 2. Graceful Shutdown
Always close connections on shutdown:
```typescript
process.on('SIGTERM', async () => {
  await client.close();
  process.exit(0);
});
```

### 3. Use Connection Pooling
- **Development**: `maxPoolSize: 10` (plenty for local dev)
- **Production**: `maxPoolSize: 50-100` (adjust based on load)

### 4. Monitor MongoDB Atlas
- Check "Metrics" tab in MongoDB Atlas
- Set up alerts for high connection counts
- Monitor connection spikes

## Why This Happened

1. **Separate worker processes** - Each worker was a separate process with its own DB connection
2. **No pool limits** - Default MongoDB driver creates up to 100 connections per client
3. **Force kills** - Using `pkill -9` doesn't allow graceful connection cleanup
4. **Multiple restarts** - Each restart left orphaned connections

## Current Status

After killing all processes:
- ✅ All Deno processes terminated
- ⏳ Waiting for MongoDB to clean up orphaned connections (10-30 min)
- 🔧 Need to implement connection pooling limits
- 🔧 Need to consolidate workers into single process

## Next Steps

1. Wait for MongoDB connections to drop (check Atlas dashboard)
2. Implement connection pooling limits in `database.ts`
3. Consolidate workers into main server process
4. Test with a single restart to verify connection count stays low
5. Add connection monitoring and graceful shutdown handlers

## Verification

After implementing fixes, verify:
```bash
# Check running processes
ps aux | grep deno | grep -v grep

# Should see only 1-2 processes, not 6+

# Check MongoDB Atlas dashboard
# Connections should be < 20 for development
```
