[0m[38;5;245mrunning 9 tests from ./src/concepts/UserAuthentication/UserAuthenticationConcept.test.ts[0m
Principle: User registers, logs in, and authenticates ...
[0m[38;5;245m------- output -------[0m

=== Testing Operational Principle ===

1. Requesting verification code...
[SMS] Verification code for +12025551234: 614186
   ✓ Verification code requested for +12025551234
   ✓ Code generated: 614186

2. Registering user...
   ✓ User registered: user:mock0

3. Requesting login code...
[SMS] Verification code for +12025551234: 536202
   ✓ Login code generated: 536202

4. Logging in...
   ✓ Login successful, token: a421a131...

5. Authenticating with token...
   ✓ Authenticated as user: user:mock0

=== Operational Principle Test Passed ===

[0m[38;5;245m----- output end -----[0m
Principle: User registers, logs in, and authenticates ... [0m[32mok[0m [0m[38;5;245m(864ms)[0m
Action: requestVerificationCode validates phone format ...
[0m[38;5;245m------- output -------[0m

=== Testing Phone Number Validation ===
[SMS] Verification code for +12025551234: 529175
✓ Valid E.164 format accepted
✓ All 4 invalid formats rejected

[0m[38;5;245m----- output end -----[0m
Action: requestVerificationCode validates phone format ... [0m[31mFAILED[0m [0m[38;5;245m(660ms)[0m
Action: requestVerificationCode replaces existing codes ...
[0m[38;5;245m------- output -------[0m

=== Testing Code Replacement ===
[SMS] Verification code for +12025551234: 806801
✓ First code: 806801
[SMS] Verification code for +12025551234: 564711
✓ Second code: 564711
✓ Old code replaced with new code

[0m[38;5;245m----- output end -----[0m
Action: requestVerificationCode replaces existing codes ... [0m[31mFAILED[0m [0m[38;5;245m(717ms)[0m
Action: register validates verification code ...
[0m[38;5;245m------- output -------[0m

=== Testing Registration Validation ===
[SMS] Verification code for +12025551234: 709188
✓ Wrong code rejected
✓ Correct code accepted
[SMS] Verification code for +12025551234: 919435
✓ Duplicate phone number rejected

[0m[38;5;245m----- output end -----[0m
Action: register validates verification code ... [0m[32mok[0m [0m[38;5;245m(848ms)[0m
Action: login requires verified credentials ...
[0m[38;5;245m------- output -------[0m

=== Testing Login Requirements ===
[SMS] Verification code for +12025551234: 710358
✓ Login without registration rejected
[SMS] Verification code for +12025551234: 901768
✓ User registered
[SMS] Verification code for +12025551234: 537829
✓ Login after registration succeeded

[0m[38;5;245m----- output end -----[0m
Action: login requires verified credentials ... [0m[32mok[0m [0m[38;5;245m(950ms)[0m
Action: logout removes session ...
[0m[38;5;245m------- output -------[0m

=== Testing Logout ===
[SMS] Verification code for +12025551234: 621079
[SMS] Verification code for +12025551234: 166924
✓ User logged in
✓ Session valid before logout
✓ Logout successful
✓ Session invalid after logout

[0m[38;5;245m----- output end -----[0m
Action: logout removes session ... [0m[32mok[0m [0m[38;5;245m(992ms)[0m
Action: authenticate rejects expired sessions ...
[0m[38;5;245m------- output -------[0m

=== Testing Session Expiration ===
[SMS] Verification code for +12025551234: 430751
[SMS] Verification code for +12025551234: 145050
✓ Session manually expired
✓ Expired session rejected
✓ Expired session cleaned up

[0m[38;5;245m----- output end -----[0m
Action: authenticate rejects expired sessions ... [0m[32mok[0m [0m[38;5;245m(967ms)[0m
Action: deleteAccount removes credentials and sessions ...
[0m[38;5;245m------- output -------[0m

=== Testing Account Deletion ===
[SMS] Verification code for +12025551234: 146847
[SMS] Verification code for +12025551234: 337038
✓ User registered and logged in
✓ Account deleted
✓ Session invalidated
✓ Credentials removed

[0m[38;5;245m----- output end -----[0m
Action: deleteAccount removes credentials and sessions ... [0m[32mok[0m [0m[38;5;245m(1s)[0m
Scenario: Multiple sessions for same user ...
[0m[38;5;245m------- output -------[0m

=== Testing Multiple Sessions ===
[SMS] Verification code for +12025551234: 262564
✓ User registered
[SMS] Verification code for +12025551234: 492380
✓ Logged in from device 1
[SMS] Verification code for +12025551234: 204575
✓ Logged in from device 2
✓ Both sessions valid
✓ User has 2 active sessions
✓ Logged out from device 1
✓ Device 2 session still valid

[0m[38;5;245m----- output end -----[0m
Scenario: Multiple sessions for same user ... [0m[32mok[0m [0m[38;5;245m(1s)[0m

[0m[1m[37m[41m ERRORS [0m

Action: requestVerificationCode validates phone format [0m[38;5;245m=> ./src/concepts/UserAuthentication/UserAuthenticationConcept.test.ts:75:6[0m
[0m[1m[31merror[0m: Leaks detected:
  - A TLS connection was opened/accepted during the test, but not closed during the test. Close the TLS connection by calling `tlsConn.close()`.
  - An async call to op_read was started in this test, but never completed.
To get more details where leaks occurred, run again with the --trace-leaks flag.

Action: requestVerificationCode replaces existing codes [0m[38;5;245m=> ./src/concepts/UserAuthentication/UserAuthenticationConcept.test.ts:102:6[0m
[0m[1m[31merror[0m: Leaks detected:
  - A TLS connection was opened/accepted before the test started, but was closed during the test. Do not close resources in a test that were not created during that test.
  - An async call to op_read was started before the test, but completed during the test. Async operations should not complete in a test if they were not started in that test.
To get more details where leaks occurred, run again with the --trace-leaks flag.

[0m[1m[37m[41m FAILURES [0m

Action: requestVerificationCode validates phone format [0m[38;5;245m=> ./src/concepts/UserAuthentication/UserAuthenticationConcept.test.ts:75:6[0m
Action: requestVerificationCode replaces existing codes [0m[38;5;245m=> ./src/concepts/UserAuthentication/UserAuthenticationConcept.test.ts:102:6[0m

[0m[31mFAILED[0m | 7 passed | 2 failed [0m[38;5;245m(8s)[0m

[0m[1m[31merror[0m: Test failed
