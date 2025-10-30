import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "JournalPrompt" + ".";

// Generic types for the concept's external dependencies
type User = ID;
type PromptTemplate = ID;

/**
 * State: A set of PromptTemplates with customizable text and ordering.
 */
interface PromptTemplateDoc {
  _id: PromptTemplate;
  user: User;
  promptText: string;
  position: number; // 1-5
  isActive: boolean;
}

/**
 * @concept JournalPromptConcept
 * @purpose Allow users to customize the reflection questions asked during their journaling sessions
 */
export default class JournalPromptConcept {
  promptTemplates: Collection<PromptTemplateDoc>;

  constructor(private readonly db: Db) {
    this.promptTemplates = this.db.collection(PREFIX + "promptTemplates");
  }

  /**
   * Action: Creates default prompts for a new user.
   * @requires User has no existing PromptTemplates
   * @effects Creates 5 default PromptTemplates with standard questions, all active
   */
  async createDefaultPrompts(
    { user }: { user: User },
  ): Promise<Empty | { error: string }> {
    // Check if user already has prompts
    const existingPrompts = await this.promptTemplates.find({ user }).toArray();
    if (existingPrompts.length > 0) {
      return { error: `User ${user} already has prompts.` };
    }

    const defaultPrompts = [
      "What are you grateful for today?",
      "What did you do today?",
      "What are you proud of today?",
      "What do you want to do tomorrow?",
    ];

    const promptDocs = defaultPrompts.map((text, index) => ({
      _id: freshID() as PromptTemplate,
      user,
      promptText: text,
      position: index + 1,
      isActive: true,
    }));

    await this.promptTemplates.insertMany(promptDocs);
    return {};
  }

  /**
   * Action: Updates the text of a prompt at a specific position.
   * @requires User has a PromptTemplate at the given position; newText is non-empty
   * @effects Updates the promptText for the PromptTemplate at position
   */
  async updatePromptText(
    { user, position, newText }: {
      user: User;
      position: number;
      newText: string;
    },
  ): Promise<Empty | { error: string }> {
    if (!newText || newText.trim().length === 0) {
      return { error: "Prompt text cannot be empty." };
    }

    if (position < 1 || position > 5) {
      return { error: "Position must be between 1 and 5." };
    }

    const prompt = await this.promptTemplates.findOne({ user, position });
    if (!prompt) {
      return {
        error: `No prompt found for user ${user} at position ${position}.`,
      };
    }

    await this.promptTemplates.updateOne(
      { _id: prompt._id },
      { $set: { promptText: newText } },
    );

    return {};
  }

  /**
   * Action: Reorders prompts according to a new sequence.
   * @requires newOrder contains all of user's PromptTemplates exactly once; at most 5 elements
   * @effects Updates position values to match the sequence order (1, 2, 3...)
   */
  async reorderPrompts(
    { user, newOrder }: { user: User; newOrder: PromptTemplate[] },
  ): Promise<Empty | { error: string }> {
    if (newOrder.length > 5) {
      return { error: "Cannot have more than 5 prompts." };
    }

    // Get all user's prompts
    const userPrompts = await this.promptTemplates.find({ user }).toArray();
    const userPromptIds = userPrompts.map((p) => p._id);

    // Verify newOrder contains all and only user's prompts
    if (newOrder.length !== userPrompts.length) {
      return {
        error:
          `New order must contain all ${userPrompts.length} of user's prompts.`,
      };
    }

    for (const promptId of newOrder) {
      if (!userPromptIds.includes(promptId)) {
        return { error: `Prompt ${promptId} does not belong to user ${user}.` };
      }
    }

    // Check for duplicates
    const uniqueIds = new Set(newOrder);
    if (uniqueIds.size !== newOrder.length) {
      return { error: "New order contains duplicate prompts." };
    }

    // Update positions
    for (let i = 0; i < newOrder.length; i++) {
      await this.promptTemplates.updateOne(
        { _id: newOrder[i] },
        { $set: { position: i + 1 } },
      );
    }

    return {};
  }

  /**
   * Action: Toggles the active status of a prompt.
   * @requires User has a PromptTemplate at the given position
   * @effects Toggles the isActive flag of the PromptTemplate
   */
  async togglePromptActive(
    { user, position }: { user: User; position: number },
  ): Promise<Empty | { error: string }> {
    if (position < 1 || position > 5) {
      return { error: "Position must be between 1 and 5." };
    }

    const prompt = await this.promptTemplates.findOne({ user, position });
    if (!prompt) {
      return {
        error: `No prompt found for user ${user} at position ${position}.`,
      };
    }

    await this.promptTemplates.updateOne(
      { _id: prompt._id },
      { $set: { isActive: !prompt.isActive } },
    );

    return {};
  }

  /**
   * Action: Deletes a prompt and renumbers remaining prompts.
   * @requires User has a PromptTemplate at the given position
   * @effects Removes the PromptTemplate; renumbers remaining prompts to maintain contiguous positions
   */
  async deletePrompt(
    { user, position }: { user: User; position: number },
  ): Promise<Empty | { error: string }> {
    if (position < 1 || position > 5) {
      return { error: "Position must be between 1 and 5." };
    }

    const prompt = await this.promptTemplates.findOne({ user, position });
    if (!prompt) {
      return {
        error: `No prompt found for user ${user} at position ${position}.`,
      };
    }

    // Delete the prompt
    await this.promptTemplates.deleteOne({ _id: prompt._id });

    // Renumber prompts with position > deleted position
    const promptsToRenumber = await this.promptTemplates
      .find({ user, position: { $gt: position } })
      .toArray();

    for (const p of promptsToRenumber) {
      await this.promptTemplates.updateOne(
        { _id: p._id },
        { $set: { position: p.position - 1 } },
      );
    }

    return {};
  }

  /**
   * Action: Adds a new prompt for a user.
   * @requires User has fewer than 5 PromptTemplates; promptText is non-empty
   * @effects Creates new PromptTemplate with isActive=true; sets position to max + 1
   */
  async addPrompt(
    { user, promptText }: { user: User; promptText: string },
  ): Promise<{ prompt: PromptTemplate } | { error: string }> {
    if (!promptText || promptText.trim().length === 0) {
      return { error: "Prompt text cannot be empty." };
    }

    const existingPrompts = await this.promptTemplates.find({ user }).toArray();
    if (existingPrompts.length >= 5) {
      return { error: "User already has 5 prompts (maximum allowed)." };
    }

    // Find max position
    const maxPosition = existingPrompts.length > 0
      ? Math.max(...existingPrompts.map((p) => p.position))
      : 0;

    const promptId = freshID() as PromptTemplate;
    await this.promptTemplates.insertOne({
      _id: promptId,
      user,
      promptText,
      position: maxPosition + 1,
      isActive: true,
    });

    return { prompt: promptId };
  }

  /**
   * Query: Retrieves all prompts for a user, ordered by position.
   */
  async _getUserPrompts(
    { user }: { user: User },
  ): Promise<PromptTemplateDoc[]> {
    return await this.promptTemplates
      .find({ user })
      .sort({ position: 1 })
      .toArray();
  }

  /**
   * Query: Retrieves only active prompts for a user, ordered by position.
   */
  async _getActivePrompts(
    { user }: { user: User },
  ): Promise<PromptTemplateDoc[]> {
    return await this.promptTemplates
      .find({ user, isActive: true })
      .sort({ position: 1 })
      .toArray();
  }
}
