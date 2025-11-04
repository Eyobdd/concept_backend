import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "UserAuthentication" + ".";

// Generic types for the concept's external dependencies
type User = ID;

/**
 * State: Credentials linking users to phone numbers.
 */
interface CredentialsDoc {
  _id: ID;
  user: User;
  phoneNumber: string; // E.164 format: +1234567890
  isVerified: boolean;
}

/**
 * State: Verification codes for phone number verification.
 */
interface VerificationCodeDoc {
  _id: ID;
  phoneNumber: string;
  code: string; // 6-digit numeric code
  createdAt: Date;
  expiresAt: Date; // Valid for 10 minutes
}

/**
 * State: Active user sessions.
 */
interface SessionDoc {
  _id: ID;
  user: User;
  token: string;
  createdAt: Date;
  expiresAt: Date; // Valid for 30 days
}

/**
 * @concept UserAuthenticationConcept
 * @purpose Authenticate users via phone number verification to establish secure sessions
 */
export default class UserAuthenticationConcept {
  credentials: Collection<CredentialsDoc>;
  verificationCodes: Collection<VerificationCodeDoc>;
  sessions: Collection<SessionDoc>;

  constructor(private readonly db: Db) {
    this.credentials = this.db.collection(PREFIX + "credentials");
    this.verificationCodes = this.db.collection(PREFIX + "verificationCodes");
    this.sessions = this.db.collection(PREFIX + "sessions");

    // Create indexes for uniqueness and performance
    this.credentials.createIndex({ phoneNumber: 1 }, { unique: true });
    this.sessions.createIndex({ token: 1 }, { unique: true });
  }

  /**
   * Action: Requests a verification code for a phone number.
   * @requires phoneNumber is valid E.164 format
   * @effects Creates VerificationCode with random 6-digit code; removes any existing code for phoneNumber
   */
  async requestVerificationCode(
    { phoneNumber }: { phoneNumber: string },
  ): Promise<Empty | { error: string }> {
    // Validate E.164 format
    if (!phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      return {
        error: "Invalid phone number format. Must be E.164 format (e.g., +1234567890).",
      };
    }

    // Remove any existing verification codes for this phone number
    await this.verificationCodes.deleteMany({ phoneNumber });

    // Generate random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

    await this.verificationCodes.insertOne({
      _id: crypto.randomUUID() as ID,
      phoneNumber,
      code,
      createdAt: now,
      expiresAt,
    });

    // In production, send SMS here via Twilio/AWS SNS
    // For MVP, just log to console
    console.log(`[SMS] Verification code for ${phoneNumber}: ${code}`);

    return {};
  }

  /**
   * Action: Registers a new user with phone number verification.
   * @requires No Credentials exist with phoneNumber; valid non-expired VerificationCode exists; code matches
   * @effects Creates new User; creates Credentials with isVerified=true; removes VerificationCode
   */
  async register(
    { phoneNumber, code, createUser }: {
      phoneNumber: string;
      code: string;
      createUser: () => Promise<User>; // Function to create user in User concept
    },
  ): Promise<{ user: User } | { error: string }> {
    // Check if phone number already registered
    const existingCredentials = await this.credentials.findOne({ phoneNumber });
    if (existingCredentials) {
      return { error: `Phone number ${phoneNumber} is already registered.` };
    }

    // Verify code
    const verificationCode = await this.verificationCodes.findOne({
      phoneNumber,
    });
    if (!verificationCode) {
      return { error: "No verification code found. Please request a new code." };
    }

    if (verificationCode.code !== code) {
      return { error: "Invalid verification code." };
    }

    if (new Date() > verificationCode.expiresAt) {
      await this.verificationCodes.deleteOne({ _id: verificationCode._id });
      return { error: "Verification code has expired. Please request a new code." };
    }

    // Create user (via provided function from User concept)
    const user = await createUser();

    // Create credentials
    await this.credentials.insertOne({
      _id: crypto.randomUUID() as ID,
      user,
      phoneNumber,
      isVerified: true,
    });

    // Remove verification code
    await this.verificationCodes.deleteOne({ _id: verificationCode._id });

    return { user };
  }

  /**
   * Action: Logs in a user with phone number verification.
   * @requires Credentials exist for phoneNumber with isVerified=true; valid non-expired VerificationCode exists; code matches
   * @effects Creates Session with fresh token; removes VerificationCode; returns token
   */
  async login(
    { phoneNumber, code }: { phoneNumber: string; code: string },
  ): Promise<{ token: string } | { error: string }> {
    // Check if credentials exist
    const credentials = await this.credentials.findOne({
      phoneNumber,
      isVerified: true,
    });
    if (!credentials) {
      return { error: `No verified account found for ${phoneNumber}.` };
    }

    // Verify code
    const verificationCode = await this.verificationCodes.findOne({
      phoneNumber,
    });
    if (!verificationCode) {
      return { error: "No verification code found. Please request a new code." };
    }

    if (verificationCode.code !== code) {
      return { error: "Invalid verification code." };
    }

    if (new Date() > verificationCode.expiresAt) {
      await this.verificationCodes.deleteOne({ _id: verificationCode._id });
      return { error: "Verification code has expired. Please request a new code." };
    }

    // Create session
    const token = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.sessions.insertOne({
      _id: crypto.randomUUID() as ID,
      user: credentials.user,
      token,
      createdAt: now,
      expiresAt,
    });

    // Remove verification code
    await this.verificationCodes.deleteOne({ _id: verificationCode._id });

    return { token };
  }

  /**
   * Action: Logs out a user by removing their session.
   * @requires Session exists with token
   * @effects Removes Session
   */
  async logout(
    { token }: { token: string },
  ): Promise<Empty | { error: string }> {
    const session = await this.sessions.findOne({ token });
    if (!session) {
      return { error: "Session not found." };
    }

    await this.sessions.deleteOne({ _id: session._id });
    return {};
  }

  /**
   * Action: Authenticates a token and returns the associated user.
   * @requires Session exists with token; Session is not expired
   * @effects Returns session.user
   */
  async authenticate(
    { token }: { token: string },
  ): Promise<{ user: User } | { error: string }> {
    const session = await this.sessions.findOne({ token });
    if (!session) {
      return { error: "Invalid session token." };
    }

    if (new Date() > session.expiresAt) {
      await this.sessions.deleteOne({ _id: session._id });
      return { error: "Session has expired. Please log in again." };
    }

    return { user: session.user };
  }

  /**
   * Action: Deletes a user's account.
   * @requires Credentials exist for user
   * @effects Removes all Sessions for user; removes Credentials
   */
  async deleteAccount(
    { user }: { user: User },
  ): Promise<Empty | { error: string }> {
    const credentials = await this.credentials.findOne({ user });
    if (!credentials) {
      return { error: `No credentials found for user ${user}.` };
    }

    // Remove all sessions for this user
    await this.sessions.deleteMany({ user });

    // Remove credentials
    await this.credentials.deleteOne({ _id: credentials._id });

    return {};
  }

  /**
   * Query: Returns user for a valid session token.
   */
  async _getSessionUser(
    { token }: { token: string },
  ): Promise<{ user: User | null }[]> {
    const session = await this.sessions.findOne({ token });
    if (!session || new Date() > session.expiresAt) {
      return [{ user: null }];
    }
    return [{ user: session.user }];
  }

  /**
   * Query: Returns user for a phone number.
   */
  async _getUserByPhone(
    { phoneNumber }: { phoneNumber: string },
  ): Promise<User | null> {
    const credentials = await this.credentials.findOne({ phoneNumber });
    return credentials?.user || null;
  }

  /**
   * Query: Returns all active sessions for a user.
   */
  async _getUserSessions(
    { user }: { user: User },
  ): Promise<SessionDoc[]> {
    return await this.sessions.find({ user }).toArray();
  }

  /**
   * Query: Returns verification code for phone (for testing only).
   */
  async _getVerificationCode(
    { phoneNumber }: { phoneNumber: string },
  ): Promise<string | null> {
    const code = await this.verificationCodes.findOne({ phoneNumber });
    return code?.code || null;
  }

  /**
   * Helper: Creates credentials for a user after verification and returns a session token (for frontend registration).
   * @requires valid non-expired VerificationCode exists; code matches; no existing credentials for phoneNumber
   * @effects Creates Credentials with isVerified=true; creates Session; removes VerificationCode
   */
  async createVerifiedCredentials(
    { user, phoneNumber, code }: { user: User; phoneNumber: string; code: string },
  ): Promise<{ token: string } | { error: string }> {
    // Check if phone number already registered
    const existingCredentials = await this.credentials.findOne({ phoneNumber });
    if (existingCredentials) {
      return { error: `Phone number ${phoneNumber} is already registered.` };
    }

    // Verify code
    const verificationCode = await this.verificationCodes.findOne({ phoneNumber });
    if (!verificationCode) {
      return { error: "No verification code found. Please request a new code." };
    }

    if (verificationCode.code !== code) {
      return { error: "Invalid verification code." };
    }

    if (new Date() > verificationCode.expiresAt) {
      await this.verificationCodes.deleteOne({ _id: verificationCode._id });
      return { error: "Verification code has expired. Please request a new code." };
    }

    // Create credentials
    await this.credentials.insertOne({
      _id: crypto.randomUUID() as ID,
      user,
      phoneNumber,
      isVerified: true,
    });

    // Remove verification code
    await this.verificationCodes.deleteOne({ _id: verificationCode._id });

    // Create session and return token (so user is automatically logged in)
    const token = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.sessions.insertOne({
      _id: crypto.randomUUID() as ID,
      user,
      token,
      createdAt: now,
      expiresAt,
    });

    return { token };
  }
}
