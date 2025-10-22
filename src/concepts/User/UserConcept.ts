import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "User" + ".";

// Internal entity types, represented as IDs
type User = ID;

/**
 * State: A set of Users with creation timestamp.
 */
interface UserDoc {
  _id: User;
  createdAt: Date;
}

/**
 * @concept UserConcept
 * @purpose Represent unique user identities in the system
 */
export default class UserConcept {
  users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * Action: Creates a new user.
   * @effects A new User is created with fresh ID and current timestamp.
   */
  async createUser(): Promise<{ user: User }> {
    const userId = freshID() as User;
    await this.users.insertOne({
      _id: userId,
      createdAt: new Date(),
    });

    return { user: userId };
  }

  /**
   * Action: Deletes a user.
   * @requires user exists
   * @effects The User is removed from the set.
   */
  async deleteUser(
    { user }: { user: User },
  ): Promise<Empty | { error: string }> {
    const existingUser = await this.users.findOne({ _id: user });
    if (!existingUser) {
      return { error: `User ${user} not found.` };
    }

    await this.users.deleteOne({ _id: user });
    return {};
  }

  /**
   * Query: Retrieves a user by ID.
   */
  async _getUser(
    { user }: { user: User },
  ): Promise<UserDoc | null> {
    return await this.users.findOne({ _id: user });
  }

  /**
   * Query: Retrieves all users.
   */
  async _getAllUsers(): Promise<UserDoc[]> {
    return await this.users.find({}).sort({ createdAt: 1 }).toArray();
  }
}
