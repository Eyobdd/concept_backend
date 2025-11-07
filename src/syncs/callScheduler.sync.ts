/**
 * CallScheduler Synchronizations
 * 
 * These syncs handle call scheduling operations.
 */

import { actions, Sync } from "@engine";
import {
  Requesting,
  UserAuthentication,
  CallScheduler,
} from "@concepts";

// ============================================================================
// CALL SCHEDULER SYNCS
// ============================================================================

export const ScheduleCallRequest: Sync = ({ request, token, callSession, phoneNumber, scheduledFor, maxRetries, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/CallScheduler/scheduleCall", token, callSession, phoneNumber, scheduledFor, maxRetries },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { user });
    frames = frames.filter(($) => $[user] !== null);
    return frames;
  },
  then: actions([CallScheduler.scheduleCall, { user, token, callSession, phoneNumber, scheduledFor, maxRetries }]),
});

export const ScheduleCallResponse: Sync = ({ request, scheduledCall }) => ({
  when: actions(
    [Requesting.request, { path: "/CallScheduler/scheduleCall" }, { request }],
    [CallScheduler.scheduleCall, {}, { scheduledCall }],
  ),
  then: actions([Requesting.respond, { request, scheduledCall }]),
});

export const ScheduleCallError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/CallScheduler/scheduleCall" }, { request }],
    [CallScheduler.scheduleCall, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// Note: _getActiveCallsForUser and _getScheduledCall are handled via passthrough
// since they are simple query methods that don't need sync orchestration
