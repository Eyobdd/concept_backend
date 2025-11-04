/**
 * Authentication Synchronizations
 * 
 * These syncs handle authentication for protected endpoints.
 * Pattern: Request comes in with token -> authenticate user -> execute action/query -> respond
 */

import { actions, Sync } from "@engine";
import {
  Requesting,
  UserAuthentication,
  Profile,
  JournalPrompt,
  ReflectionSession,
  JournalEntry,
  CallWindow,
} from "@concepts";

// ============================================================================
// PROFILE SYNCS
// ============================================================================

export const CreateProfileRequest: Sync = ({ request, token, displayName, phoneNumber, timezone, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/Profile/createProfile", token, displayName, phoneNumber, timezone },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    return frames;
  },
  then: actions([Profile.createProfile, { user, displayName, phoneNumber, timezone }]),
});

export const CreateProfileResponse: Sync = ({ request, profile }) => ({
  when: actions(
    [Requesting.request, { path: "/Profile/createProfile" }, { request }],
    [Profile.createProfile, {}, { profile }],
  ),
  then: actions([Requesting.respond, { request, profile }]),
});

export const GetProfileRequest: Sync = ({ request, token, user, profile }) => ({
  when: actions([
    Requesting.request,
    { path: "/Profile/_getProfile", token },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    frames = frames.filter(($) => $[user] !== null);
    if (frames.length === 0) return frames;
    frames = await frames.query(Profile._getProfile, { user }, { profile });
    return frames;
  },
  then: actions([Requesting.respond, { request, profile }]),
});

export const UpdateRatingPreferenceRequest: Sync = ({ request, token, includeRating, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/Profile/updateRatingPreference", token, includeRating },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    return frames;
  },
  then: actions([Profile.updateRatingPreference, { user, includeRating }]),
});

export const UpdateRatingPreferenceResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Profile/updateRatingPreference" }, { request }],
    [Profile.updateRatingPreference, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

// ============================================================================
// JOURNAL PROMPT SYNCS
// ============================================================================

export const CreateDefaultPromptsRequest: Sync = ({ request, token, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/JournalPrompt/createDefaultPrompts", token },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    return frames;
  },
  then: actions([JournalPrompt.createDefaultPrompts, { user }]),
});

export const CreateDefaultPromptsResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/JournalPrompt/createDefaultPrompts" }, { request }],
    [JournalPrompt.createDefaultPrompts, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const GetUserPromptsRequest: Sync = ({ request, token, user, prompts }) => ({
  when: actions([
    Requesting.request,
    { path: "/JournalPrompt/_getUserPrompts", token },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    frames = frames.filter(($) => $[user] !== null);
    if (frames.length === 0) return frames;
    frames = await frames.query(JournalPrompt._getUserPrompts, { user }, { prompts });
    return frames;
  },
  then: actions([Requesting.respond, { request, prompts }]),
});

export const GetActivePromptsRequest: Sync = ({ request, token, user, prompts }) => ({
  when: actions([
    Requesting.request,
    { path: "/JournalPrompt/_getActivePrompts", token },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    frames = frames.filter(($) => $[user] !== null);
    if (frames.length === 0) return frames;
    frames = await frames.query(JournalPrompt._getActivePrompts, { user }, { prompts });
    return frames;
  },
  then: actions([Requesting.respond, { request, prompts }]),
});

export const AddPromptRequest: Sync = ({ request, token, promptText, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/JournalPrompt/addPrompt", token, promptText },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    return frames;
  },
  then: actions([JournalPrompt.addPrompt, { user, promptText }]),
});

export const AddPromptResponse: Sync = ({ request, prompt }) => ({
  when: actions(
    [Requesting.request, { path: "/JournalPrompt/addPrompt" }, { request }],
    [JournalPrompt.addPrompt, {}, { prompt }],
  ),
  then: actions([Requesting.respond, { request, prompt }]),
});

export const UpdatePromptTextRequest: Sync = ({ request, token, position, newText, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/JournalPrompt/updatePromptText", token, position, newText },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    return frames;
  },
  then: actions([JournalPrompt.updatePromptText, { user, position, newText }]),
});

export const UpdatePromptTextResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/JournalPrompt/updatePromptText" }, { request }],
    [JournalPrompt.updatePromptText, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const TogglePromptActiveRequest: Sync = ({ request, token, position, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/JournalPrompt/togglePromptActive", token, position },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    return frames;
  },
  then: actions([JournalPrompt.togglePromptActive, { user, position }]),
});

export const TogglePromptActiveResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/JournalPrompt/togglePromptActive" }, { request }],
    [JournalPrompt.togglePromptActive, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const DeletePromptRequest: Sync = ({ request, token, position, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/JournalPrompt/deletePrompt", token, position },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    return frames;
  },
  then: actions([JournalPrompt.deletePrompt, { user, position }]),
});

export const DeletePromptResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/JournalPrompt/deletePrompt" }, { request }],
    [JournalPrompt.deletePrompt, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const ReorderPromptsRequest: Sync = ({ request, token, newOrder, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/JournalPrompt/reorderPrompts", token, newOrder },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    return frames;
  },
  then: actions([JournalPrompt.reorderPrompts, { user, newOrder }]),
});

export const ReorderPromptsResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/JournalPrompt/reorderPrompts" }, { request }],
    [JournalPrompt.reorderPrompts, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

// ============================================================================
// CALL WINDOW SYNCS
// ============================================================================

export const CreateRecurringCallWindowRequest: Sync = ({ request, token, dayOfWeek, startTime, endTime, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/CallWindow/createRecurringCallWindow", token, dayOfWeek, startTime, endTime },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    return frames;
  },
  then: actions([CallWindow.createRecurringCallWindow, { user, dayOfWeek, startTime, endTime }]),
});

export const CreateRecurringCallWindowResponse: Sync = ({ request, callWindow }) => ({
  when: actions(
    [Requesting.request, { path: "/CallWindow/createRecurringCallWindow" }, { request }],
    [CallWindow.createRecurringCallWindow, {}, { callWindow }],
  ),
  then: actions([Requesting.respond, { request, callWindow }]),
});

export const CreateOneOffCallWindowRequest: Sync = ({ request, token, specificDate, startTime, endTime, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/CallWindow/createOneOffCallWindow", token, specificDate, startTime, endTime },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    return frames;
  },
  then: actions([CallWindow.createOneOffCallWindow, { user, specificDate, startTime, endTime }]),
});

export const CreateOneOffCallWindowResponse: Sync = ({ request, callWindow }) => ({
  when: actions(
    [Requesting.request, { path: "/CallWindow/createOneOffCallWindow" }, { request }],
    [CallWindow.createOneOffCallWindow, {}, { callWindow }],
  ),
  then: actions([Requesting.respond, { request, callWindow }]),
});

export const CreateOneOffCallWindowError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/CallWindow/createOneOffCallWindow" }, { request }],
    [CallWindow.createOneOffCallWindow, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export const MergeOverlappingOneOffWindowsRequest: Sync = ({ request, token, user, specificDate, startTime, endTime }) => ({
  when: actions([
    Requesting.request,
    { path: "/CallWindow/mergeOverlappingOneOffWindows", token, specificDate, startTime, endTime },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    return frames;
  },
  then: actions([CallWindow.mergeOverlappingOneOffWindows, { user, specificDate, startTime, endTime }]),
});

export const MergeOverlappingOneOffWindowsResponse: Sync = ({ request, callWindow }) => ({
  when: actions(
    [Requesting.request, { path: "/CallWindow/mergeOverlappingOneOffWindows" }, { request }],
    [CallWindow.mergeOverlappingOneOffWindows, {}, { callWindow }],
  ),
  then: actions([Requesting.respond, { request, callWindow }]),
});

export const MergeOverlappingOneOffWindowsError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/CallWindow/mergeOverlappingOneOffWindows" }, { request }],
    [CallWindow.mergeOverlappingOneOffWindows, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export const GetUserCallWindowsRequest: Sync = ({ request, token, user, windows }) => ({
  when: actions([
    Requesting.request,
    { path: "/CallWindow/_getUserCallWindows", token },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    frames = frames.filter(($) => $[user] !== null);
    if (frames.length === 0) return frames;
    frames = await frames.query(CallWindow._getUserCallWindows, { user }, { windows });
    return frames;
  },
  then: actions([Requesting.respond, { request, windows }]),
});

export const GetUserRecurringWindowsRequest: Sync = ({ request, token, user, windows }) => ({
  when: actions([
    Requesting.request,
    { path: "/CallWindow/_getUserRecurringWindows", token },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    frames = frames.filter(($) => $[user] !== null);
    if (frames.length === 0) return frames;
    frames = await frames.query(CallWindow._getUserRecurringWindows, { user }, { windows });
    return frames;
  },
  then: actions([Requesting.respond, { request, windows }]),
});

export const GetUserOneOffWindowsRequest: Sync = ({ request, token, user, windows }) => ({
  when: actions([
    Requesting.request,
    { path: "/CallWindow/_getUserOneOffWindows", token },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    frames = frames.filter(($) => $[user] !== null);
    if (frames.length === 0) return frames;
    frames = await frames.query(CallWindow._getUserOneOffWindows, { user }, { windows });
    return frames;
  },
  then: actions([Requesting.respond, { request, windows }]),
});

export const DeleteRecurringCallWindowRequest: Sync = ({ request, token, dayOfWeek, startTime, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/CallWindow/deleteRecurringCallWindow", token, dayOfWeek, startTime },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    return frames;
  },
  then: actions([CallWindow.deleteRecurringCallWindow, { user, dayOfWeek, startTime }]),
});

export const DeleteRecurringCallWindowResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/CallWindow/deleteRecurringCallWindow" }, { request }],
    [CallWindow.deleteRecurringCallWindow, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const DeleteOneOffCallWindowRequest: Sync = ({ request, token, specificDate, startTime, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/CallWindow/deleteOneOffCallWindow", token, specificDate, startTime },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    return frames;
  },
  then: actions([CallWindow.deleteOneOffCallWindow, { user, specificDate, startTime }]),
});

export const DeleteOneOffCallWindowResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/CallWindow/deleteOneOffCallWindow" }, { request }],
    [CallWindow.deleteOneOffCallWindow, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const SetDayModeCustomRequest: Sync = ({ request, token, date, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/CallWindow/setDayModeCustom", token, date },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    return frames;
  },
  then: actions([CallWindow.setDayModeCustom, { user, date }]),
});

export const SetDayModeCustomResponse: Sync = ({ request, dayMode }) => ({
  when: actions(
    [Requesting.request, { path: "/CallWindow/setDayModeCustom" }, { request }],
    [CallWindow.setDayModeCustom, {}, { dayMode }],
  ),
  then: actions([Requesting.respond, { request, dayMode }]),
});

export const SetDayModeRecurringRequest: Sync = ({ request, token, date, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/CallWindow/setDayModeRecurring", token, date },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    return frames;
  },
  then: actions([CallWindow.setDayModeRecurring, { user, date }]),
});

export const SetDayModeRecurringResponse: Sync = ({ request, dayMode }) => ({
  when: actions(
    [Requesting.request, { path: "/CallWindow/setDayModeRecurring" }, { request }],
    [CallWindow.setDayModeRecurring, {}, { dayMode }],
  ),
  then: actions([Requesting.respond, { request, dayMode }]),
});

export const ShouldUseRecurringRequest: Sync = ({ request, token, date, user, useRecurring }) => ({
  when: actions([
    Requesting.request,
    { path: "/CallWindow/shouldUseRecurring", token, date },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    frames = frames.filter(($) => $[user] !== null);
    if (frames.length === 0) return frames;
    frames = await frames.query(CallWindow.shouldUseRecurring, { user, date }, { useRecurring });
    return frames;
  },
  then: actions([Requesting.respond, { request, useRecurring }]),
});

// ============================================================================
// REFLECTION SESSION SYNCS
// ============================================================================

export const StartSessionRequest: Sync = ({ request, token, callSession, prompts, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/ReflectionSession/startSession", token, callSession, prompts },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    return frames;
  },
  then: actions([ReflectionSession.startSession, { user, callSession, prompts }]),
});

export const StartSessionResponse: Sync = ({ request, session }) => ({
  when: actions(
    [Requesting.request, { path: "/ReflectionSession/startSession" }, { request }],
    [ReflectionSession.startSession, {}, { session }],
  ),
  then: actions([Requesting.respond, { request, session }]),
});

export const RecordResponseRequest: Sync = ({ request, token, session, promptId, promptText, position, responseText, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/ReflectionSession/recordResponse", token, session, promptId, promptText, position, responseText },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    return frames;
  },
  then: actions([ReflectionSession.recordResponse, { session, promptId, promptText, position, responseText }]),
});

export const RecordResponseResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ReflectionSession/recordResponse" }, { request }],
    [ReflectionSession.recordResponse, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const CompleteSessionRequest: Sync = ({ request, token, session, expectedPromptCount, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/ReflectionSession/completeSession", token, session, expectedPromptCount },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    return frames;
  },
  then: actions([ReflectionSession.completeSession, { session, expectedPromptCount }]),
});

export const CompleteSessionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ReflectionSession/completeSession" }, { request }],
    [ReflectionSession.completeSession, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const GetSessionResponsesRequest: Sync = ({ request, token, session, user, responses }) => ({
  when: actions([
    Requesting.request,
    { path: "/ReflectionSession/_getSessionResponses", token, session },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    frames = frames.filter(($) => $[user] !== null);
    if (frames.length === 0) return frames;
    frames = await frames.query(ReflectionSession._getSessionResponses, { session }, { responses });
    return frames;
  },
  then: actions([Requesting.respond, { request, responses }]),
});

export const GetSessionRequest: Sync = ({ request, token, session, user, sessionData }) => ({
  when: actions([
    Requesting.request,
    { path: "/ReflectionSession/_getSession", token, session },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    frames = frames.filter(($) => $[user] !== null);
    if (frames.length === 0) return frames;
    frames = await frames.query(ReflectionSession._getSession, { session }, { sessionData });
    return frames;
  },
  then: actions([Requesting.respond, { request, sessionData }]),
});

// ============================================================================
// JOURNAL ENTRY SYNCS
// ============================================================================

export const CreateFromSessionRequest: Sync = ({ request, token, sessionData, sessionResponses, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/JournalEntry/createFromSession", token, sessionData, sessionResponses },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    return frames;
  },
  then: actions([JournalEntry.createFromSession, { sessionData, sessionResponses }]),
});

export const CreateFromSessionResponse: Sync = ({ request, entry }) => ({
  when: actions(
    [Requesting.request, { path: "/JournalEntry/createFromSession" }, { request }],
    [JournalEntry.createFromSession, {}, { entry }],
  ),
  then: actions([Requesting.respond, { request, entry }]),
});

export const GetEntriesByUserRequest: Sync = ({ request, token, user, entries }) => ({
  when: actions([
    Requesting.request,
    { path: "/JournalEntry/_getEntriesByUser", token },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    frames = frames.filter(($) => $[user] !== null);
    if (frames.length === 0) return frames;
    frames = await frames.query(JournalEntry._getEntriesByUser, { user }, { entries });
    return frames;
  },
  then: actions([Requesting.respond, { request, entries }]),
});

export const GetEntriesWithResponsesByUserRequest: Sync = ({ request, token, user, entries }) => ({
  when: actions([
    Requesting.request,
    { path: "/JournalEntry/_getEntriesWithResponsesByUser", token },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    frames = frames.filter(($) => $[user] !== null);
    if (frames.length === 0) return frames;
    frames = await frames.query(JournalEntry._getEntriesWithResponsesByUser, { user }, { entries });
    return frames;
  },
  then: actions([Requesting.respond, { request, entries }]),
});

export const GetEntryByDateRequest: Sync = ({ request, token, date, user, entry }) => ({
  when: actions([
    Requesting.request,
    { path: "/JournalEntry/_getEntryByDate", token, date },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    frames = frames.filter(($) => $[user] !== null);
    if (frames.length === 0) return frames;
    frames = await frames.query(JournalEntry._getEntryByDate, { user, date }, { entry });
    return frames;
  },
  then: actions([Requesting.respond, { request, entry }]),
});

export const GetEntryResponsesRequest: Sync = ({ request, token, entry, user, responses }) => ({
  when: actions([
    Requesting.request,
    { path: "/JournalEntry/_getEntryResponses", token, entry },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    frames = frames.filter(($) => $[user] !== null);
    if (frames.length === 0) return frames;
    frames = await frames.query(JournalEntry._getEntryResponses, { entry }, { responses });
    return frames;
  },
  then: actions([Requesting.respond, { request, responses }]),
});
