import { ID } from "./types.ts";
import { getDb } from "./database.ts";

type User = ID;

/**
 * Helper function to extract user from token
 * Used by concept actions that accept either user or token
 * 
 * Note: Queries database directly to avoid circular dependencies with UserAuthentication concept
 */
export async function getUserFromToken(token: string): Promise<User | null> {
  try {
    const [db] = await getDb();
    const sessions = db.collection("UserAuthentication.sessions");
    const session = await sessions.findOne({ token });
    return session?.user || null;
  } catch (error) {
    console.error("[getUserFromToken] Error:", error);
    return null;
  }
}

/**
 * Helper function to get user from either direct user parameter or token
 * Returns user ID or error message
 */
export async function resolveUser(
  { user, token }: { user?: User; token?: string }
): Promise<{ user: User } | { error: string }> {
  if (user) {
    return { user };
  }
  
  if (token) {
    const resolvedUser = await getUserFromToken(token);
    if (resolvedUser) {
      return { user: resolvedUser };
    }
  }
  
  return { error: "Authentication required. Please provide a valid user or token." };
}
