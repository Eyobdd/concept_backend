import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "CallWindow" + ".";

// Generic types for the concept's external dependencies
type User = ID;

// Internal entity types, represented as IDs
type CallWindow = ID;

// Enum types for day of week
type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

/**
 * State: Base CallWindow document with common fields.
 */
interface CallWindowDoc {
  _id: CallWindow;
  user: User;
  startTime: Date; // DateTime stored as Date object
  endTime: Date; // DateTime stored as Date object
  windowType: "RECURRING" | "ONEOFF"; // Discriminator for the two subsets
}

/**
 * State: RecurringWindow - a CallWindow that repeats weekly on a specific day.
 */
interface RecurringWindowDoc extends CallWindowDoc {
  windowType: "RECURRING";
  dayOfWeek: DayOfWeek;
}

/**
 * State: OneOffWindow - a CallWindow for a specific date.
 */
interface OneOffWindowDoc extends CallWindowDoc {
  windowType: "ONEOFF";
  specificDate: string; // Date stored as ISO string (YYYY-MM-DD)
}

/**
 * Union type for all window documents
 */
type AnyCallWindowDoc = RecurringWindowDoc | OneOffWindowDoc;

/**
 * @concept CallWindowConcept
 * @purpose Define a user's availability for receiving calls
 */
export default class CallWindowConcept {
  callWindows: Collection<AnyCallWindowDoc>;

  constructor(private readonly db: Db) {
    this.callWindows = this.db.collection(PREFIX + "callWindows");
  }

  /**
   * Action: Creates a recurring call window that repeats weekly.
   * @requires endTime must be later than startTime.
   * @requires No existing recurring window for the same user, dayOfWeek, and startTime.
   * @effects A new recurring CallWindow is created and returned.
   */
  async createRecurringCallWindow(
    { user, dayOfWeek, startTime, endTime }: {
      user: User;
      dayOfWeek: DayOfWeek;
      startTime: Date;
      endTime: Date;
    },
  ): Promise<{ callWindow: CallWindow } | { error: string }> {
    // Validate time ordering
    if (endTime <= startTime) {
      return { error: "endTime must be later than startTime." };
    }

    // Check for existing recurring window with same user, dayOfWeek, and startTime
    const existing = await this.callWindows.findOne({
      user,
      windowType: "RECURRING",
      dayOfWeek,
      startTime,
    } as Partial<RecurringWindowDoc>);

    if (existing) {
      return {
        error:
          `A recurring window already exists for user ${user} on ${dayOfWeek} at ${startTime.toISOString()}.`,
      };
    }

    const windowId = freshID() as CallWindow;
    const newWindow: RecurringWindowDoc = {
      _id: windowId,
      user,
      windowType: "RECURRING",
      dayOfWeek,
      startTime,
      endTime,
    };

    await this.callWindows.insertOne(newWindow);
    return { callWindow: windowId };
  }

  /**
   * Action: Creates a one-off call window for a specific date.
   * @requires endTime must be later than startTime.
   * @requires No existing one-off window for the same user, specificDate, and startTime.
   * @effects A new one-off CallWindow is created and returned.
   */
  async createOneOffCallWindow(
    { user, specificDate, startTime, endTime }: {
      user: User;
      specificDate: string; // ISO date string (YYYY-MM-DD)
      startTime: Date;
      endTime: Date;
    },
  ): Promise<{ callWindow: CallWindow } | { error: string }> {
    // Validate time ordering
    if (endTime <= startTime) {
      return { error: "endTime must be later than startTime." };
    }

    // Check for existing one-off window with same user, specificDate, and startTime
    const existing = await this.callWindows.findOne({
      user,
      windowType: "ONEOFF",
      specificDate,
      startTime,
    } as Partial<OneOffWindowDoc>);

    if (existing) {
      return {
        error:
          `A one-off window already exists for user ${user} on ${specificDate} at ${startTime.toISOString()}.`,
      };
    }

    const windowId = freshID() as CallWindow;
    const newWindow: OneOffWindowDoc = {
      _id: windowId,
      user,
      windowType: "ONEOFF",
      specificDate,
      startTime,
      endTime,
    };

    await this.callWindows.insertOne(newWindow);
    return { callWindow: windowId };
  }

  /**
   * Action: Deletes a recurring call window.
   * @requires The recurring window must exist.
   * @effects The recurring window is removed from the set.
   */
  async deleteRecurringCallWindow(
    { user, dayOfWeek, startTime }: {
      user: User;
      dayOfWeek: DayOfWeek;
      startTime: Date;
    },
  ): Promise<Empty | { error: string }> {
    const result = await this.callWindows.deleteOne({
      user,
      windowType: "RECURRING",
      dayOfWeek,
      startTime,
    } as Partial<RecurringWindowDoc>);

    if (result.deletedCount === 0) {
      return {
        error:
          `No recurring window found for user ${user} on ${dayOfWeek} at ${startTime.toISOString()}.`,
      };
    }

    return {};
  }

  /**
   * Action: Deletes a one-off call window.
   * @requires The one-off window must exist.
   * @effects The one-off window is removed from the set.
   */
  async deleteOneOffCallWindow(
    { user, specificDate, startTime }: {
      user: User;
      specificDate: string;
      startTime: Date;
    },
  ): Promise<Empty | { error: string }> {
    const result = await this.callWindows.deleteOne({
      user,
      windowType: "ONEOFF",
      specificDate,
      startTime,
    } as Partial<OneOffWindowDoc>);

    if (result.deletedCount === 0) {
      return {
        error:
          `No one-off window found for user ${user} on ${specificDate} at ${startTime.toISOString()}.`,
      };
    }

    return {};
  }

  /**
   * Query: Retrieves all call windows for a specific user.
   */
  async _getUserCallWindows(
    { user }: { user: User },
  ): Promise<AnyCallWindowDoc[]> {
    return await this.callWindows.find({ user }).toArray();
  }

  /**
   * Query: Retrieves all recurring call windows for a specific user.
   */
  async _getUserRecurringWindows(
    { user }: { user: User },
  ): Promise<RecurringWindowDoc[]> {
    const results = await this.callWindows.find({
      user,
      windowType: "RECURRING",
    } as Partial<RecurringWindowDoc>).toArray();
    return results as RecurringWindowDoc[];
  }

  /**
   * Query: Retrieves all one-off call windows for a specific user.
   */
  async _getUserOneOffWindows(
    { user }: { user: User },
  ): Promise<OneOffWindowDoc[]> {
    const results = await this.callWindows.find({
      user,
      windowType: "ONEOFF",
    } as Partial<OneOffWindowDoc>).toArray();
    return results as OneOffWindowDoc[];
  }

  /**
   * Query: Retrieves all recurring windows for a specific day of the week.
   */
  async _getRecurringWindowsByDay(
    { dayOfWeek }: { dayOfWeek: DayOfWeek },
  ): Promise<RecurringWindowDoc[]> {
    const results = await this.callWindows.find({
      windowType: "RECURRING",
      dayOfWeek,
    } as Partial<RecurringWindowDoc>).toArray();
    return results as RecurringWindowDoc[];
  }

  /**
   * Query: Retrieves all one-off windows for a specific date.
   */
  async _getOneOffWindowsByDate(
    { specificDate }: { specificDate: string },
  ): Promise<OneOffWindowDoc[]> {
    const results = await this.callWindows.find({
      windowType: "ONEOFF",
      specificDate,
    } as Partial<OneOffWindowDoc>).toArray();
    return results as OneOffWindowDoc[];
  }
}
