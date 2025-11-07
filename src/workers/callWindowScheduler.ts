/**
 * CallWindow Scheduler Worker
 * 
 * This worker monitors call windows and automatically schedules calls when:
 * 1. A call window becomes active (current time is within the window)
 * 2. No reflection session exists for today
 * 3. No call is already scheduled/in-progress for today
 * 
 * Runs every 5 minutes to check for active windows.
 */

import { Db } from "npm:mongodb";
import { getDb } from "@utils/database.ts";
import CallWindowConcept from "@concepts/CallWindow/CallWindowConcept.ts";
import CallSchedulerConcept from "@concepts/CallScheduler/CallSchedulerConcept.ts";
import ReflectionSessionConcept from "@concepts/ReflectionSession/ReflectionSessionConcept.ts";
import ProfileConcept from "@concepts/Profile/ProfileConcept.ts";
import JournalEntryConcept from "@concepts/JournalEntry/JournalEntryConcept.ts";
import JournalPromptConcept from "@concepts/JournalPrompt/JournalPromptConcept.ts";

interface WorkerConfig {
  pollIntervalMinutes?: number;
}

export class CallWindowScheduler {
  private db: Db;
  private callWindowConcept: CallWindowConcept;
  private callSchedulerConcept: CallSchedulerConcept;
  private reflectionSessionConcept: ReflectionSessionConcept;
  private profileConcept: ProfileConcept;
  private journalEntryConcept: JournalEntryConcept;
  private journalPromptConcept: JournalPromptConcept;
  private pollInterval: number;
  private isRunning: boolean = false;
  private intervalId?: number;

  constructor(db: Db, config: WorkerConfig = {}) {
    this.db = db;
    this.pollInterval = (config.pollIntervalMinutes || 5) * 60 * 1000;

    // Initialize concepts
    this.callWindowConcept = new CallWindowConcept(db);
    this.callSchedulerConcept = new CallSchedulerConcept(db);
    this.reflectionSessionConcept = new ReflectionSessionConcept(db);
    this.profileConcept = new ProfileConcept(db);
    this.journalEntryConcept = new JournalEntryConcept(db);
    this.journalPromptConcept = new JournalPromptConcept(db);
  }

  /**
   * Starts the worker
   */
  start() {
    if (this.isRunning) {
      console.log("[CallWindowScheduler] Already running");
      return;
    }

    this.isRunning = true;
    console.log(
      `[CallWindowScheduler] Starting (poll interval: ${this.pollInterval / 60000} minutes)`,
    );

    // Run immediately
    this.checkAndScheduleCalls();

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.checkAndScheduleCalls();
    }, this.pollInterval);

    console.log("[CallWindowScheduler] Running. Press Ctrl+C to stop.");
  }

  /**
   * Stops the worker
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    console.log("[CallWindowScheduler] Stopped");
  }

  /**
   * Main worker logic: Check for active windows and schedule calls
   */
  private async checkAndScheduleCalls() {
    try {
      const now = new Date();
      const today = this.getDateString(now);
      const dayOfWeek = this.getDayOfWeek(now);
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

      console.log(
        `[CallWindowScheduler] Checking at ${now.toISOString()} (${dayOfWeek}, ${currentTime})`,
      );

      // Get all users with call windows
      // Note: This is inefficient for large user bases. In production, you'd want to:
      // 1. Index call windows by time
      // 2. Query only active windows
      // 3. Use a more sophisticated scheduling algorithm
      const allWindows = await this.callWindowConcept.callWindows.find({}).toArray();
      
      // Group windows by user
      const userWindows = new Map<string, any[]>();
      for (const window of allWindows) {
        const user = window.user;
        if (!userWindows.has(user)) {
          userWindows.set(user, []);
        }
        userWindows.get(user)!.push(window);
      }

      console.log(`[CallWindowScheduler] Found ${userWindows.size} users with call windows`);

      // Check each user
      for (const [user, windows] of userWindows) {
        await this.processUserWindows(user, windows, today, dayOfWeek, currentTime, now);
      }

      console.log("[CallWindowScheduler] Check complete");
    } catch (error) {
      console.error("[CallWindowScheduler] Error:", error);
    }
  }

  /**
   * Process call windows for a single user
   */
  private async processUserWindows(
    user: string,
    windows: any[],
    today: string,
    dayOfWeek: string,
    currentTime: string,
    now: Date,
  ) {
    try {
      // Check if user already has a journal entry for today
      const entryResult = await this.journalEntryConcept._getEntryByDate({
        user,
        date: today,
      });
      
      
      if (entryResult[0].entry) {
        // User already completed reflection for today
        return;
      }

      // Check if user already has an active call scheduled
      const activeCallsResult = await this.callSchedulerConcept._getActiveCallsForUser({
        user,
      });
      
      if (activeCallsResult.length > 0) {
        // User already has a call scheduled/in-progress
        return;
      }

      // Check if any window is currently active
      const activeWindow = this.findActiveWindow(windows, today, dayOfWeek, currentTime);
      
      if (!activeWindow) {
        // No active window right now
        return;
      }

      console.log(`[CallWindowScheduler] Active window found for user ${user}`);

      // Get user profile for phone number
      const profileResult = await this.profileConcept._getProfile({ user });
      const profile = profileResult[0].profile;

      if (!profile || !profile.phoneNumber) {
        console.log(`[CallWindowScheduler] User ${user} has no phone number`);
        return;
      }

      // Fetch active prompts from database
      const promptsResult = await this.journalPromptConcept._getActivePrompts({ user });
      const activePrompts = promptsResult[0].prompts;

      if (activePrompts.length === 0) {
        console.log(`[CallWindowScheduler] User ${user} has no active prompts configured`);
        return;
      }

      // Sort prompts: regular prompts first (by position), then rating prompts at the end
      const regularPrompts = activePrompts.filter(p => !p.isRatingPrompt).sort((a, b) => a.position - b.position);
      const ratingPrompts = activePrompts.filter(p => p.isRatingPrompt).sort((a, b) => a.position - b.position);
      const sortedPrompts = [...regularPrompts, ...ratingPrompts];
      
      console.log(`[CallWindowScheduler] Prompt order: ${sortedPrompts.map((p, i) => `${i+1}. ${p.promptText.substring(0, 30)}... (rating=${p.isRatingPrompt})`).join(', ')}`);

      // Convert to session prompt format (include all active prompts, rating prompts last)
      const prompts = sortedPrompts.map(p => ({
        promptId: p._id,
        promptText: p.promptText,
      }));

      // Generate call session ID
      const callSession = `auto:${user}:${Date.now()}`;

      // Create reflection session with actual prompts
      const sessionResult = await this.reflectionSessionConcept.startSession({
        user,
        callSession,
        method: "PHONE",
        prompts,
      });

      if ("error" in sessionResult) {
        console.error(
          `[CallWindowScheduler] Failed to create session for ${user}: ${sessionResult.error}`,
        );
        return;
      }

      // Schedule call for right now
      const callResult = await this.callSchedulerConcept.scheduleCall({
        user,
        callSession,
        phoneNumber: profile.phoneNumber,
        scheduledFor: now,
        maxRetries: 3,
      });

      if ("error" in callResult) {
        console.error(
          `[CallWindowScheduler] Failed to schedule call for ${user}: ${callResult.error}`,
        );
        return;
      }

      console.log(
        `[CallWindowScheduler] ✅ Scheduled call for ${user} (${profile.phoneNumber})`,
      );
    } catch (error) {
      console.error(`[CallWindowScheduler] Error processing user ${user}:`, error);
    }
  }

  /**
   * Find if any window is currently active
   */
  private findActiveWindow(
    windows: any[],
    today: string,
    dayOfWeek: string,
    currentTime: string,
  ): any | null {
    // Check one-off windows first (higher priority)
    for (const window of windows) {
      if (window.windowType === "ONEOFF" && window.specificDate === today) {
        const startTime = this.formatTime(window.startTime);
        const endTime = this.formatTime(window.endTime);
        
        if (this.isTimeInRange(currentTime, startTime, endTime)) {
          return window;
        }
      }
    }

    // Check recurring windows
    for (const window of windows) {
      if (window.windowType === "RECURRING" && window.dayOfWeek === dayOfWeek) {
        const startTime = this.formatTime(window.startTime);
        const endTime = this.formatTime(window.endTime);
        
        if (this.isTimeInRange(currentTime, startTime, endTime)) {
          return window;
        }
      }
    }

    return null;
  }

  /**
   * Format Date object to HH:MM string
   */
  private formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  /**
   * Check if current time is within a time range
   */
  private isTimeInRange(current: string, start: string, end: string): boolean {
    return current >= start && current <= end;
  }

  /**
   * Get date string in YYYY-MM-DD format
   */
  private getDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Get day of week string
   */
  private getDayOfWeek(date: Date): string {
    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    return days[date.getDay()];
  }
}

// Main entry point
if (import.meta.main) {
  const [db] = await getDb();
  const scheduler = new CallWindowScheduler(db, {
    pollIntervalMinutes: 5, // Check every 5 minutes
  });

  scheduler.start();

  // Handle graceful shutdown
  Deno.addSignalListener("SIGINT", () => {
    console.log("\nReceived SIGINT, shutting down...");
    scheduler.stop();
    Deno.exit(0);
  });
}
