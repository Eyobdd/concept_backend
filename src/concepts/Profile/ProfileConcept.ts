import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "Profile" + ".";

// Generic types for the concept's external dependencies
type User = ID;

/**
 * State: A set of Profiles with user info.
 */
interface ProfileDoc {
  _id: ID;
  user: User;
  displayName: string;
  phoneNumber: string; // E.164 format: +1234567890
  timezone: string; // IANA timezone: "America/New_York"
  includeRating: boolean; // Whether to include day rating prompt in reflection calls
  updatedAt: Date;
}

/**
 * @concept ProfileConcept
 * @purpose Store user profile information including display preferences and contact details
 */
export default class ProfileConcept {
  profiles: Collection<ProfileDoc>;

  constructor(private readonly db: Db) {
    this.profiles = this.db.collection(PREFIX + "profiles");
  }

  /**
   * Action: Creates a new profile for a user.
   * @requires No Profile exists for user; phoneNumber is valid E.164 format; timezone is valid IANA timezone
   * @effects A new Profile is created with the provided information.
   */
  async createProfile(
    { user, displayName, phoneNumber, timezone }: {
      user: User;
      displayName: string;
      phoneNumber: string;
      timezone: string;
    },
  ): Promise<{ profile: ID } | { error: string }> {
    // Check if profile already exists for this user
    const existingProfile = await this.profiles.findOne({ user });
    if (existingProfile) {
      return { error: `Profile already exists for user ${user}.` };
    }

    // Basic validation for E.164 format (starts with +, followed by digits)
    if (!phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      return { error: `Invalid phone number format. Must be E.164 format (e.g., +1234567890).` };
    }

    // Note: Full timezone validation would require a library; for now we accept any string
    // In production, you'd validate against IANA timezone database

    const profileId = crypto.randomUUID() as ID;
    await this.profiles.insertOne({
      _id: profileId,
      user,
      displayName,
      phoneNumber,
      timezone,
      includeRating: true, // Default to including rating prompt
      updatedAt: new Date(),
    });

    return { profile: profileId };
  }

  /**
   * Action: Updates the display name for a user's profile.
   * @requires Profile exists for user; displayName is non-empty
   * @effects Updates profile.displayName and sets updatedAt to current time.
   */
  async updateDisplayName(
    { user, displayName }: { user: User; displayName: string },
  ): Promise<Empty | { error: string }> {
    if (!displayName || displayName.trim().length === 0) {
      return { error: "Display name cannot be empty." };
    }

    const profile = await this.profiles.findOne({ user });
    if (!profile) {
      return { error: `No profile found for user ${user}.` };
    }

    await this.profiles.updateOne(
      { user },
      { $set: { displayName, updatedAt: new Date() } },
    );

    return {};
  }

  /**
   * Action: Updates the phone number for a user's profile.
   * @requires Profile exists for user; phoneNumber is valid E.164 format
   * @effects Updates profile.phoneNumber and sets updatedAt to current time.
   */
  async updatePhoneNumber(
    { user, phoneNumber }: { user: User; phoneNumber: string },
  ): Promise<Empty | { error: string }> {
    if (!phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      return { error: `Invalid phone number format. Must be E.164 format (e.g., +1234567890).` };
    }

    const profile = await this.profiles.findOne({ user });
    if (!profile) {
      return { error: `No profile found for user ${user}.` };
    }

    await this.profiles.updateOne(
      { user },
      { $set: { phoneNumber, updatedAt: new Date() } },
    );

    return {};
  }

  /**
   * Action: Updates the timezone for a user's profile.
   * @requires Profile exists for user; timezone is valid IANA timezone string
   * @effects Updates profile.timezone and sets updatedAt to current time.
   */
  async updateTimezone(
    { user, timezone }: { user: User; timezone: string },
  ): Promise<Empty | { error: string }> {
    const profile = await this.profiles.findOne({ user });
    if (!profile) {
      return { error: `No profile found for user ${user}.` };
    }

    await this.profiles.updateOne(
      { user },
      { $set: { timezone, updatedAt: new Date() } },
    );

    return {};
  }

  /**
   * Action: Updates the rating preference for a user's profile.
   * @requires Profile exists for user
   * @effects Updates profile.includeRating and sets updatedAt to current time.
   */
  async updateRatingPreference(
    { user, includeRating }: { user: User; includeRating: boolean },
  ): Promise<Empty | { error: string }> {
    const profile = await this.profiles.findOne({ user });
    if (!profile) {
      return { error: `No profile found for user ${user}.` };
    }

    await this.profiles.updateOne(
      { user },
      { $set: { includeRating, updatedAt: new Date() } },
    );

    return {};
  }

  /**
   * Action: Deletes a user's profile.
   * @requires Profile exists for user
   * @effects Removes the profile.
   */
  async deleteProfile(
    { user }: { user: User },
  ): Promise<Empty | { error: string }> {
    const profile = await this.profiles.findOne({ user });
    if (!profile) {
      return { error: `No profile found for user ${user}.` };
    }

    await this.profiles.deleteOne({ user });
    return {};
  }

  /**
   * Query: Retrieves a user's profile.
   */
  async _getProfile(
    { user }: { user: User },
  ): Promise<ProfileDoc | null> {
    return await this.profiles.findOne({ user });
  }

  /**
   * Query: Retrieves all profiles.
   */
  async _getAllProfiles(): Promise<ProfileDoc[]> {
    return await this.profiles.find({}).toArray();
  }
}
