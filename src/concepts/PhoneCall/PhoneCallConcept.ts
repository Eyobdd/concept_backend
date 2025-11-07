import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "PhoneCall" + ".";

// Generic types for the concept's external dependencies
type User = ID;
type ReflectionSession = ID;
type PhoneCall = ID;

// Enum for call status
type CallStatus = "INITIATED" | "CONNECTED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED" | "FAILED";

/**
 * State: A set of PhoneCalls tracking active phone reflection sessions.
 */
interface PhoneCallDoc {
  _id: PhoneCall;
  user: User;
  reflectionSession: ReflectionSession;
  twilioCallSid: string;
  status: CallStatus;
  prompts: Array<{ promptId: ID; promptText: string; isRatingPrompt?: boolean }>;
  currentPromptIndex: number;
  accumulatedTranscript: string;
  currentResponseBuffer: string;
  lastSpeechTime: Date;
  createdAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

/**
 * @concept PhoneCallConcept
 * @purpose Manage the lifecycle and state of phone calls for reflection sessions
 */
export default class PhoneCallConcept {
  phoneCalls: Collection<PhoneCallDoc>;

  constructor(private readonly db: Db) {
    this.phoneCalls = this.db.collection(PREFIX + "phoneCalls");
  }

  /**
   * Action: Initiates a new phone call for a reflection session.
   * @requires No IN_PROGRESS PhoneCall exists for user; ReflectionSession exists and is IN_PROGRESS
   * @effects Creates new PhoneCall with INITIATED status
   */
  async initiateCall(
    { user, reflectionSession, twilioCallSid }: {
      user: User;
      reflectionSession: ReflectionSession;
      twilioCallSid: string;
    },
  ): Promise<{ phoneCall: PhoneCall } | { error: string }> {
    // Check for existing IN_PROGRESS call
    const existingCall = await this.phoneCalls.findOne({
      user,
      status: "IN_PROGRESS",
    });
    if (existingCall) {
      return {
        error: `User ${user} already has an IN_PROGRESS phone call: ${existingCall._id}`,
      };
    }

    const phoneCallId = freshID() as PhoneCall;
    const now = new Date();
    await this.phoneCalls.insertOne({
      _id: phoneCallId,
      user,
      reflectionSession,
      twilioCallSid,
      status: "INITIATED",
      prompts: [], // Will be set via setPrompts action
      currentPromptIndex: 0,
      accumulatedTranscript: "",
      currentResponseBuffer: "",
      lastSpeechTime: now,
      createdAt: now,
    });

    return { phoneCall: phoneCallId };
  }

  /**
   * Action: Sets the prompts for a call.
   * @requires PhoneCall exists
   * @effects Sets prompts array on the PhoneCall document
   */
  async setPrompts(
    { twilioCallSid, prompts }: { twilioCallSid: string; prompts: Array<{ promptId: ID; promptText: string; isRatingPrompt?: boolean }> },
  ): Promise<Empty | { error: string }> {
    const call = await this.phoneCalls.findOne({ twilioCallSid });
    if (!call) {
      return { error: `Phone call with SID ${twilioCallSid} not found.` };
    }

    await this.phoneCalls.updateOne(
      { twilioCallSid },
      { $set: { prompts } },
    );

    return {};
  }

  /**
   * Action: Marks a call as connected.
   * @requires PhoneCall exists with INITIATED status
   * @effects Sets status to CONNECTED
   */
  async markConnected(
    { twilioCallSid }: { twilioCallSid: string },
  ): Promise<Empty | { error: string }> {
    const call = await this.phoneCalls.findOne({ twilioCallSid });
    if (!call) {
      return { error: `Phone call with SID ${twilioCallSid} not found.` };
    }

    if (call.status !== "INITIATED") {
      return {
        error: `Phone call must be INITIATED to mark connected. Current status: ${call.status}.`,
      };
    }

    await this.phoneCalls.updateOne(
      { twilioCallSid },
      { $set: { status: "CONNECTED" } },
    );

    return {};
  }

  /**
   * Action: Starts the prompting phase of the call.
   * @requires PhoneCall exists with CONNECTED status
   * @effects Sets status to IN_PROGRESS
   */
  async startPrompting(
    { twilioCallSid }: { twilioCallSid: string },
  ): Promise<Empty | { error: string }> {
    const call = await this.phoneCalls.findOne({ twilioCallSid });
    if (!call) {
      return { error: `Phone call with SID ${twilioCallSid} not found.` };
    }

    if (call.status !== "CONNECTED") {
      return {
        error: `Phone call must be CONNECTED to start prompting. Current status: ${call.status}.`,
      };
    }

    await this.phoneCalls.updateOne(
      { twilioCallSid },
      { $set: { status: "IN_PROGRESS" } },
    );

    return {};
  }

  /**
   * Action: Appends text to the call transcript.
   * @requires PhoneCall exists with IN_PROGRESS status
   * @effects Appends to transcript and buffer, updates lastSpeechTime
   */
  async appendToTranscript(
    { twilioCallSid, text }: { twilioCallSid: string; text: string },
  ): Promise<Empty | { error: string }> {
    const call = await this.phoneCalls.findOne({ twilioCallSid });
    if (!call) {
      return { error: `Phone call with SID ${twilioCallSid} not found.` };
    }

    if (call.status !== "IN_PROGRESS") {
      return {
        error: `Phone call must be IN_PROGRESS to append transcript. Current status: ${call.status}.`,
      };
    }

    const newTranscript = call.accumulatedTranscript + text;
    const newBuffer = call.currentResponseBuffer + text;

    await this.phoneCalls.updateOne(
      { twilioCallSid },
      {
        $set: {
          accumulatedTranscript: newTranscript,
          currentResponseBuffer: newBuffer,
          lastSpeechTime: new Date(),
        },
      },
    );

    return {};
  }

  /**
   * Action: Advances to the next prompt in the sequence.
   * @requires PhoneCall exists with IN_PROGRESS status; not on last prompt
   * @effects Increments currentPromptIndex, clears buffer
   */
  async advanceToNextPrompt(
    { twilioCallSid }: { twilioCallSid: string },
  ): Promise<Empty | { error: string }> {
    const call = await this.phoneCalls.findOne({ twilioCallSid });
    if (!call) {
      return { error: `Phone call with SID ${twilioCallSid} not found.` };
    }

    if (call.status !== "IN_PROGRESS") {
      return {
        error: `Phone call must be IN_PROGRESS to advance prompt. Current status: ${call.status}.`,
      };
    }

    if (call.currentPromptIndex >= call.prompts.length - 1) {
      return {
        error: `Already on last prompt (${call.currentPromptIndex}/${call.prompts.length - 1}).`,
      };
    }

    await this.phoneCalls.updateOne(
      { twilioCallSid },
      {
        $set: {
          currentPromptIndex: call.currentPromptIndex + 1,
          currentResponseBuffer: "",
        },
      },
    );

    return {};
  }

  /**
   * Action: Marks the call as completed.
   * @requires PhoneCall exists with IN_PROGRESS status
   * @effects Sets status to COMPLETED, sets completedAt
   */
  async markCompleted(
    { twilioCallSid }: { twilioCallSid: string },
  ): Promise<Empty | { error: string }> {
    const call = await this.phoneCalls.findOne({ twilioCallSid });
    if (!call) {
      return { error: `Phone call with SID ${twilioCallSid} not found.` };
    }

    if (call.status !== "IN_PROGRESS") {
      return {
        error: `Phone call must be IN_PROGRESS to mark completed. Current status: ${call.status}.`,
      };
    }

    await this.phoneCalls.updateOne(
      { twilioCallSid },
      {
        $set: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      },
    );

    return {};
  }

  /**
   * Action: Marks the call as abandoned.
   * @requires PhoneCall exists (not already COMPLETED, ABANDONED, or FAILED)
   * @effects Sets status to ABANDONED, sets errorMessage and completedAt
   */
  async markAbandoned(
    { twilioCallSid, reason }: { twilioCallSid: string; reason: string },
  ): Promise<Empty | { error: string }> {
    const call = await this.phoneCalls.findOne({ twilioCallSid });
    if (!call) {
      return { error: `Phone call with SID ${twilioCallSid} not found.` };
    }

    if (["COMPLETED", "ABANDONED", "FAILED"].includes(call.status)) {
      return {
        error: `Phone call is already ${call.status}, cannot abandon.`,
      };
    }

    await this.phoneCalls.updateOne(
      { twilioCallSid },
      {
        $set: {
          status: "ABANDONED",
          errorMessage: reason,
          completedAt: new Date(),
        },
      },
    );

    return {};
  }

  /**
   * Action: Marks the call as failed.
   * @requires PhoneCall exists (not already COMPLETED, ABANDONED, or FAILED)
   * @effects Sets status to FAILED, sets errorMessage and completedAt
   */
  async markFailed(
    { twilioCallSid, error }: { twilioCallSid: string; error: string },
  ): Promise<Empty | { error: string }> {
    const call = await this.phoneCalls.findOne({ twilioCallSid });
    if (!call) {
      return { error: `Phone call with SID ${twilioCallSid} not found.` };
    }

    if (["COMPLETED", "ABANDONED", "FAILED"].includes(call.status)) {
      return {
        error: `Phone call is already ${call.status}, cannot mark failed.`,
      };
    }

    await this.phoneCalls.updateOne(
      { twilioCallSid },
      {
        $set: {
          status: "FAILED",
          errorMessage: error,
          completedAt: new Date(),
        },
      },
    );

    return {};
  }

  /**
   * Query: Retrieves a phone call by Twilio call SID.
   */
  async _getPhoneCall(
    { twilioCallSid }: { twilioCallSid: string },
  ): Promise<{ call: PhoneCallDoc | null }[]> {
    const call = await this.phoneCalls.findOne({ twilioCallSid });
    return [{ call }];
  }

  /**
   * Query: Retrieves the active (IN_PROGRESS) phone call for a user.
   */
  async _getActivePhoneCall(
    { user }: { user: User },
  ): Promise<{ call: PhoneCallDoc | null }[]> {
    const call = await this.phoneCalls.findOne({
      user,
      status: "IN_PROGRESS",
    });
    return [{ call }];
  }

  /**
   * Query: Retrieves the phone call for a reflection session.
   */
  async _getPhoneCallBySession(
    { reflectionSession }: { reflectionSession: ReflectionSession },
  ): Promise<{ call: PhoneCallDoc | null }[]> {
    const call = await this.phoneCalls.findOne({ reflectionSession });
    return [{ call }];
  }
}
