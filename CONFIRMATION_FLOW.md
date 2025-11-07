# Call Confirmation Flow

## Overview

The enhanced call system now includes a confirmation step at the beginning of each call to ensure the user is ready before starting the reflection prompts.

## Call Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Enhanced Call Flow                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Call Initiated                                          │
│     ↓                                                       │
│     User answers phone                                      │
│                                                             │
│  2. Greeting & Confirmation (currentPromptIndex = 0)       │
│     ↓                                                       │
│     System: "Hello [Name]. This is your daily reflection   │
│              call. Are you ready to begin? Please say      │
│              yes or no."                                    │
│                                                             │
│  3. User Response                                           │
│     ↓                                                       │
│     ┌─────────────┬──────────────┬──────────────┐         │
│     │             │              │              │         │
│     ▼             ▼              ▼              │         │
│   "Yes"        "No"          Unclear            │         │
│     │             │              │              │         │
│     ▼             ▼              ▼              │         │
│  Start         Polite         Ask Again ────────┘         │
│  Prompts       Goodbye                                     │
│     │             │                                        │
│     ▼             ▼                                        │
│  Prompt 1      End Call                                    │
│  (index=1)     (Abandoned)                                 │
│     │                                                      │
│     ▼                                                      │
│  Prompt 2                                                  │
│  (index=2)                                                 │
│     │                                                      │
│     ▼                                                      │
│  ...                                                       │
│     │                                                      │
│     ▼                                                      │
│  Call Complete                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Response Detection

### Affirmative Responses (Proceed with Call)
The system recognizes these as "yes":
- "yes"
- "yeah"
- "sure"
- "ready"
- "okay"
- "ok"

### Negative Responses (End Call Politely)
The system recognizes these as "no":
- "no"
- "not"
- "later"
- "busy"

### Unclear Responses (Ask Again)
If the system doesn't detect a clear yes or no, it will ask again:
- "I didn't quite catch that. Are you ready for your reflection call? Please say yes or no."

## Technical Implementation

### Index System
- **Index 0**: Confirmation phase (waiting for yes/no)
- **Index 1**: First prompt (after confirmation)
- **Index 2**: Second prompt
- **Index N**: Nth prompt

### Key Changes

#### 1. Greeting Message
```typescript
private generateGreeting(userName: string, namePronunciation?: string): string {
  const name = namePronunciation || userName;
  return `Hello ${name}. This is your daily reflection call. Are you ready to begin? Please say yes or no.`;
}
```

#### 2. Initial TwiML
- Only plays greeting (no first prompt)
- First prompt is played AFTER confirmation

#### 3. Confirmation Handler
```typescript
private async handleConfirmationResponse(
  twilioCallSid: string,
  response: string,
  prompts: CallPrompt[],
): Promise<void>
```

**If Yes:**
- Advances to index 1
- Plays first prompt
- Continues with normal flow

**If No:**
- Plays goodbye message: "No problem. We'll call you back at a better time. Have a great day!"
- Waits 4 seconds
- Ends call
- Marks call as abandoned

**If Unclear:**
- Asks for clarification
- Stays at index 0
- Waits for another response

## User Experience

### Scenario 1: User is Ready
```
System: "Hello Sarah. This is your daily reflection call. 
         Are you ready to begin? Please say yes or no."
User:   "Yes"
System: "What are you grateful for today?"
User:   [Responds to prompt]
System: "What is one thing you learned today?"
...
```

### Scenario 2: User is Busy
```
System: "Hello Sarah. This is your daily reflection call. 
         Are you ready to begin? Please say yes or no."
User:   "No, I'm busy right now"
System: "No problem. We'll call you back at a better time. 
         Have a great day!"
[Call ends]
```

### Scenario 3: Unclear Response
```
System: "Hello Sarah. This is your daily reflection call. 
         Are you ready to begin? Please say yes or no."
User:   "Uh, maybe..."
System: "I didn't quite catch that. Are you ready for your 
         reflection call? Please say yes or no."
User:   "Yes"
System: "What are you grateful for today?"
...
```

## Benefits

### 1. Respectful of User's Time
- Doesn't force user into reflection if they're busy
- Allows user to decline politely
- Promises to call back later

### 2. Better User Experience
- Clear expectations set upfront
- User has control over the call
- Reduces frustration from unexpected calls

### 3. Higher Quality Responses
- User is mentally prepared
- More engaged responses
- Better reflection quality

### 4. Reduced Abandoned Calls
- User explicitly confirms readiness
- Fewer mid-call abandonments
- Cleaner session data

## Database Impact

### Call States
- **Abandoned (User Declined)**: User said "no" during confirmation
- **Completed**: User confirmed and completed all prompts
- **Failed**: Technical error occurred

### Session Data
- Confirmation responses are NOT recorded as prompt responses
- Only actual reflection responses are saved
- Abandoned calls don't create incomplete journal entries

## Testing

### Test Case 1: Affirmative Response
1. Schedule a call
2. Answer and say "yes"
3. Verify first prompt plays
4. Complete reflection
5. Check journal entry created

### Test Case 2: Negative Response
1. Schedule a call
2. Answer and say "no"
3. Verify goodbye message plays
4. Verify call ends gracefully
5. Check call marked as abandoned
6. Verify no journal entry created

### Test Case 3: Unclear Response
1. Schedule a call
2. Answer and say something unclear
3. Verify clarification message plays
4. Say "yes"
5. Verify first prompt plays
6. Complete reflection normally

## Configuration

### Timing
- **Goodbye message duration**: 4 seconds
- **Pause threshold**: 5 seconds (same as prompts)
- **Confirmation timeout**: 60 seconds (same as prompts)

### Voice Settings
- **Voice**: Polly.Joanna (Twilio fallback)
- **Speaking rate**: 0.95 (slightly slower for clarity)
- **Language**: en-US

## Future Enhancements

### Possible Improvements
1. **Rescheduling**: "Would you like me to call back in 30 minutes?"
2. **Reason tracking**: "May I ask why you're not ready?"
3. **Time preference**: "What time works better for you?"
4. **Snooze option**: "Should I try again in an hour?"

### Analytics
- Track confirmation acceptance rate
- Identify best call times
- Optimize call window suggestions
- Reduce declined calls

## Summary

✅ **Confirmation flow implemented**  
✅ **Respectful of user's time**  
✅ **Clear yes/no detection**  
✅ **Polite goodbye for declines**  
✅ **Clarification for unclear responses**  
✅ **Seamless integration with existing flow**

The confirmation flow ensures users are ready and willing to engage in their reflection call, leading to better quality responses and a more respectful user experience.
