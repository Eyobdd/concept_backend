import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { resolveUser } from "@utils/auth.ts";

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
  namePronunciation?: string; // Phonetic pronunciation guide for TTS
  maxRetries: number; // Maximum number of call retry attempts (minimum 1)
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
    { user, token, displayName, phoneNumber, timezone, namePronunciation }: {
      user?: User;
      token?: string;
      displayName: string;
      phoneNumber: string;
      timezone: string;
      namePronunciation?: string;
    },
  ): Promise<{ profile: ID } | { error: string }> {
    // Resolve user from either user parameter or token
    const userResult = await resolveUser({ user, token });
    if ("error" in userResult) {
      return userResult;
    }
    user = userResult.user;
    
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
    const profileDoc: any = {
      _id: profileId,
      user,
      displayName,
      phoneNumber,
      timezone,
      maxRetries: 4, // Default to 4 retry attempts
      updatedAt: new Date(),
    };

    // Add namePronunciation if provided
    if (namePronunciation) {
      profileDoc.namePronunciation = namePronunciation;
    }

    await this.profiles.insertOne(profileDoc);

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
  ): Promise<{ profile: ProfileDoc | null }[]> {
    const profile = await this.profiles.findOne({ user });
    return [{ profile }];
  }

  /**
   * Query: Retrieves all profiles.
   */
  async _getAllProfiles(): Promise<ProfileDoc[]> {
    return await this.profiles.find({}).toArray();
  }

  /**
   * Action: Updates the name pronunciation for a user's profile.
   * @requires Profile exists for user
   * @effects Updates profile.namePronunciation and sets updatedAt to current time.
   */
  async updateNamePronunciation(
    { user, namePronunciation }: { user: User; namePronunciation: string },
  ): Promise<Empty | { error: string }> {
    const profile = await this.profiles.findOne({ user });
    if (!profile) {
      return { error: `No profile found for user ${user}.` };
    }

    await this.profiles.updateOne(
      { user },
      { $set: { namePronunciation, updatedAt: new Date() } },
    );

    return {};
  }

  /**
   * Action: Updates the maximum retry attempts for a user's profile.
   * @requires Profile exists for user; maxRetries is at least 1
   * @effects Updates profile.maxRetries and sets updatedAt to current time.
   */
  async updateMaxRetries(
    { user, maxRetries }: { user: User; maxRetries: number },
  ): Promise<Empty | { error: string }> {
    if (!Number.isInteger(maxRetries) || maxRetries < 1) {
      return { error: "maxRetries must be an integer of at least 1." };
    }

    const profile = await this.profiles.findOne({ user });
    if (!profile) {
      return { error: `No profile found for user ${user}.` };
    }

    await this.profiles.updateOne(
      { user },
      { $set: { maxRetries, updatedAt: new Date() } },
    );

    return {};
  }

  /**
   * Action: Updates multiple profile fields at once.
   * @requires Profile exists for user; all provided fields are valid
   * @effects Updates specified profile fields and sets updatedAt to current time.
   */
  async updateProfile(
    { user, token, updates }: {
      user?: User;
      token?: string;
      updates: {
        displayName?: string;
        phoneNumber?: string;
        timezone?: string;
        namePronunciation?: string;
        includeRating?: boolean;
        maxRetries?: number;
      };
    },
  ): Promise<Empty | { error: string }> {
    // Resolve user from either user parameter or token
    const userResult = await resolveUser({ user, token });
    if ("error" in userResult) {
      return userResult;
    }
    user = userResult.user;

    const profile = await this.profiles.findOne({ user });
    if (!profile) {
      return { error: `No profile found for user ${user}.` };
    }

    // Validate updates
    if (updates.displayName !== undefined && updates.displayName.trim().length === 0) {
      return { error: "Display name cannot be empty." };
    }

    if (updates.phoneNumber !== undefined && !updates.phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      return { error: `Invalid phone number format. Must be E.164 format (e.g., +1234567890).` };
    }

    if (updates.maxRetries !== undefined && (!Number.isInteger(updates.maxRetries) || updates.maxRetries < 1)) {
      return { error: "maxRetries must be an integer of at least 1." };
    }

    // Build update object with only provided fields
    const updateFields: any = { updatedAt: new Date() };
    if (updates.displayName !== undefined) updateFields.displayName = updates.displayName;
    if (updates.phoneNumber !== undefined) updateFields.phoneNumber = updates.phoneNumber;
    if (updates.timezone !== undefined) updateFields.timezone = updates.timezone;
    if (updates.namePronunciation !== undefined) updateFields.namePronunciation = updates.namePronunciation;
    if (updates.includeRating !== undefined) updateFields.includeRating = updates.includeRating;
    if (updates.maxRetries !== undefined) updateFields.maxRetries = updates.maxRetries;

    await this.profiles.updateOne(
      { user },
      { $set: updateFields },
    );

    return {};
  }
}
