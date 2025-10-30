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
 * State: DayMode - tracks whether a day uses recurring (default) or custom (one-off) windows
 */
interface DayModeDoc {
  _id: ID;
  user: User;
  date: string; // Date stored as ISO string (YYYY-MM-DD)
  useRecurring: boolean; // true = show recurring windows, false = show one-off windows
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
  dayModes: Collection<DayModeDoc>;

  constructor(private readonly db: Db) {
    this.callWindows = this.db.collection(PREFIX + "callWindows");
    this.dayModes = this.db.collection(PREFIX + "dayModes");
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
    // Convert string dates to Date objects if needed
    const start = startTime instanceof Date ? startTime : new Date(startTime);
    const end = endTime instanceof Date ? endTime : new Date(endTime);
    
    // Validate time ordering
    if (end <= start) {
      return { error: "endTime must be later than startTime." };
    }

    // Check for existing recurring window with same user, dayOfWeek, and startTime
    const existing = await this.callWindows.findOne({
      user,
      windowType: "RECURRING",
      dayOfWeek,
      startTime: start,
    } as Partial<RecurringWindowDoc>);

    if (existing) {
      return {
        error:
          `A recurring window already exists for user ${user} on ${dayOfWeek} at ${start.toISOString()}.`,
      };
    }

    const windowId = freshID() as CallWindow;
    const newWindow: RecurringWindowDoc = {
      _id: windowId,
      user,
      windowType: "RECURRING",
      dayOfWeek,
      startTime: start,
      endTime: end,
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
    // Convert string dates to Date objects if needed
    const start = startTime instanceof Date ? startTime : new Date(startTime);
    const end = endTime instanceof Date ? endTime : new Date(endTime);
    
    // Validate time ordering
    if (end <= start) {
      return { error: "endTime must be later than startTime." };
    }

    // Check for existing one-off window with same user, specificDate, and startTime
    const existing = await this.callWindows.findOne({
      user,
      windowType: "ONEOFF",
      specificDate,
      startTime: start,
    } as Partial<OneOffWindowDoc>);

    if (existing) {
      return {
        error:
          `A one-off window already exists for user ${user} on ${specificDate} at ${start.toISOString()}.`,
      };
    }

    const windowId = freshID() as CallWindow;
    const newWindow: OneOffWindowDoc = {
      _id: windowId,
      user,
      windowType: "ONEOFF",
      specificDate,
      startTime: start,
      endTime: end,
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
    // Convert string date to Date object if needed
    const start = startTime instanceof Date ? startTime : new Date(startTime);
    
    const result = await this.callWindows.deleteOne({
      user,
      windowType: "RECURRING",
      dayOfWeek,
      startTime: start,
    } as Partial<RecurringWindowDoc>);

    if (result.deletedCount === 0) {
      return {
        error:
          `No recurring window found for user ${user} on ${dayOfWeek} at ${start.toISOString()}.`,
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
    // Convert string date to Date object if needed
    const start = startTime instanceof Date ? startTime : new Date(startTime);
    
    const result = await this.callWindows.deleteOne({
      user,
      windowType: "ONEOFF",
      specificDate,
      startTime: start,
    } as Partial<OneOffWindowDoc>);

    if (result.deletedCount === 0) {
      return {
        error:
          `No one-off window found for user ${user} on ${specificDate} at ${start.toISOString()}.`,
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

  /**
   * Action: Merges overlapping one-off call windows for a specific date.
   * @requires endTime must be later than startTime.
   * @requires At least one overlapping window must exist.
   * @effects All overlapping windows are deleted and replaced with a single merged window.
   */
  async mergeOverlappingOneOffWindows(
    { user, specificDate, startTime, endTime }: {
      user: User;
      specificDate: string;
      startTime: Date;
      endTime: Date;
    },
  ): Promise<{ callWindow: CallWindow } | { error: string }> {
    // Convert string dates to Date objects if needed
    const start = startTime instanceof Date ? startTime : new Date(startTime);
    const end = endTime instanceof Date ? endTime : new Date(endTime);
    
    // Validate time ordering
    if (end <= start) {
      return { error: "endTime must be later than startTime." };
    }

    // Find all overlapping windows for this user on this date
    const allWindows = await this.callWindows.find({
      user,
      windowType: "ONEOFF",
      specificDate,
    } as Partial<OneOffWindowDoc>).toArray() as OneOffWindowDoc[];

    // Filter to only overlapping windows
    const overlappingWindows = allWindows.filter((window) => {
      // Convert window times to Date objects if needed
      const windowStart = window.startTime instanceof Date ? window.startTime : new Date(window.startTime);
      const windowEnd = window.endTime instanceof Date ? window.endTime : new Date(window.endTime);
      // Two windows overlap if: window.start < endTime AND window.end > startTime
      return windowStart < end && windowEnd > start;
    });

    if (overlappingWindows.length === 0) {
      return {
        error:
          `No overlapping windows found for user ${user} on ${specificDate}.`,
      };
    }

    // Calculate merged time range
    // Convert all times to Date objects and get timestamps
    const allStartTimes = [
      ...overlappingWindows.map((w) => w.startTime instanceof Date ? w.startTime : new Date(w.startTime)),
      start
    ];
    const allEndTimes = [
      ...overlappingWindows.map((w) => w.endTime instanceof Date ? w.endTime : new Date(w.endTime)),
      end
    ];
    
    const mergedStartTime = new Date(Math.min(...allStartTimes.map((t) => t.getTime())));
    const mergedEndTime = new Date(Math.max(...allEndTimes.map((t) => t.getTime())));

    // Delete all overlapping windows
    await this.callWindows.deleteMany({
      _id: { $in: overlappingWindows.map((w) => w._id) },
    });

    // Create the merged window
    const windowId = freshID() as CallWindow;
    const mergedWindow: OneOffWindowDoc = {
      _id: windowId,
      user,
      windowType: "ONEOFF",
      specificDate,
      startTime: mergedStartTime,
      endTime: mergedEndTime,
    };

    await this.callWindows.insertOne(mergedWindow);
    return { callWindow: windowId };
  }

  /**
   * Action: Set day mode to custom (use one-off windows, not recurring)
   * @effects Sets or updates the day mode to use one-off windows
   */
  async setDayModeCustom({ user, date }: { user: User; date: string }) {
    const existing = await this.dayModes.findOne({ user, date });
    
    if (existing) {
      // Update existing
      await this.dayModes.updateOne(
        { user, date },
        { $set: { useRecurring: false } }
      );
      return { dayMode: existing._id };
    }

    // Create new
    const dayModeId = freshID();
    const dayMode: DayModeDoc = {
      _id: dayModeId,
      user,
      date,
      useRecurring: false,
    };

    await this.dayModes.insertOne(dayMode);
    return { dayMode: dayModeId };
  }

  /**
   * Action: Set day mode to recurring (use recurring windows, default mode)
   * @effects Sets or updates the day mode to use recurring windows
   */
  async setDayModeRecurring({ user, date }: { user: User; date: string }) {
    const existing = await this.dayModes.findOne({ user, date });
    
    if (existing) {
      // Update existing
      await this.dayModes.updateOne(
        { user, date },
        { $set: { useRecurring: true } }
      );
      return { dayMode: existing._id };
    }

    // Create new
    const dayModeId = freshID();
    const dayMode: DayModeDoc = {
      _id: dayModeId,
      user,
      date,
      useRecurring: true,
    };

    await this.dayModes.insertOne(dayMode);
    return { dayMode: dayModeId };
  }

  /**
   * Query: Check if a day should use recurring windows
   * @returns true if should use recurring (default), false if should use one-off (custom)
   */
  async shouldUseRecurring({ user, date }: { user: User; date: string }): Promise<boolean> {
    const dayMode = await this.dayModes.findOne({ user, date });
    // Default to true (use recurring) if no mode is set
    return dayMode === null ? true : dayMode.useRecurring;
  }
}
