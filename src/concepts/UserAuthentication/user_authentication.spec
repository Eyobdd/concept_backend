<concept_spec>
	concept UserAuthenticationConcept[User]

	purpose
    Authenticate users via phone number verification to establish secure sessions

  principle
    A user registers with a phone number and receives a verification code via SMS. 
    After verification, they can log in by requesting a new code. Sessions persist 
    until logout or expiration.

  state
    a set of Credentials with
      a user User
      a phoneNumber String     # E.164 format: +1234567890
      a isVerified Flag

    a set of VerificationCodes with
      a phoneNumber String
      a code String            # 6-digit numeric code
      a createdAt DateTime
      a expiresAt DateTime     # Valid for 10 minutes

    a set of Sessions with
      a user User
      a token String
      a createdAt DateTime
      a expiresAt DateTime     # Valid for 30 days

  invariants
    Each phoneNumber is unique across all Credentials.
    Each token is unique across all active Sessions.
    VerificationCodes expire after 10 minutes.
    Sessions expire after 30 days.

  actions
    requestVerificationCode(phoneNumber: String)
      requires: phoneNumber is valid E.164 format.
      effect: 
        - Removes any existing VerificationCode for phoneNumber.
        - Creates VerificationCode with random 6-digit code.
        - Sets createdAt to current time.
        - Sets expiresAt to 10 minutes from now.
        - External effect: Sends SMS with code (or logs to console in dev mode).

    register(phoneNumber: String, code: String): User
      requires: 
        - No Credentials exist with phoneNumber.
        - Valid non-expired VerificationCode exists for phoneNumber.
        - code matches stored code.
      effect: 
        - Creates new User.
        - Creates Credentials with phoneNumber, isVerified=true.
        - Removes VerificationCode.
        - Returns user.

    login(phoneNumber: String, code: String): (token: String)
      requires: 
        - Credentials exist for phoneNumber with isVerified=true.
        - Valid non-expired VerificationCode exists for phoneNumber.
        - code matches stored code.
      effect: 
        - Creates Session with fresh random token.
        - Sets createdAt to current time.
        - Sets expiresAt to 30 days from now.
        - Removes VerificationCode.
        - Returns token.

    logout(token: String)
      requires: Session exists with token.
      effect: Removes Session.

    authenticate(token: String): User
      requires: 
        - Session exists with token.
        - Session.expiresAt > current time.
      effect: Returns session.user.

    deleteAccount(user: User)
      requires: Credentials exist for user.
      effect: 
        - Removes all Sessions for user.
        - Removes Credentials for user.

    _getSessionUser(token: String): User
      effect: Returns user for token, or null if invalid/expired.

    _getUserByPhone(phoneNumber: String): User
      effect: Returns user for phoneNumber, or null if not found.

    _getUserSessions(user: User): seq of Session
      effect: Returns all active sessions for user.

    _getVerificationCode(phoneNumber: String): String
      effect: Returns verification code for phoneNumber, or null if none exists. (For testing only)

    createVerifiedCredentials(user: User, phoneNumber: String, code: String): (token: String)
      requires:
        - No Credentials exist with phoneNumber.
        - Valid non-expired VerificationCode exists for phoneNumber.
        - code matches stored code.
      effect:
        - Creates Credentials with phoneNumber, isVerified=true.
        - Creates Session with fresh random token.
        - Removes VerificationCode.
        - Returns token.

<concept_spec/>
