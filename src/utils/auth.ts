import { ID } from "./types.ts";

type User = ID;

/**
 * Helper function to extract user from token
 * Used by concept actions that accept either user or token
 */
export async function getUserFromToken(token: string): Promise<User | null> {
  const { UserAuthentication } = await import("../concepts/concepts.ts");
  const sessionResult = await UserAuthentication._getSessionUser({ token });
  return sessionResult[0]?.user || null;
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
