<concept_spec>
	concept ProfileConcept[User]

	purpose
    Store user profile information including display preferences and contact details

  principle
    Each user has a profile containing their display name, phone number, and timezone. 
    This information can be updated at any time and is used across the application 
    for personalization and communication.

  state
    a set of Profiles with
      a user User
      a displayName String
      a phoneNumber String       # E.164 format: +1234567890
      a timezone String          # IANA timezone: "America/New_York"
      a includeRating Flag       # Whether to include day rating prompt in reflection calls
      a updatedAt DateTime

  invariants
    Each user has at most one Profile.
    phoneNumber must be in valid E.164 format.

  actions
    createProfile(user: User, displayName: String, phoneNumber: String, timezone: String): Profile
      requires: 
        - No Profile exists for user.
        - phoneNumber is valid E.164 format.
        - timezone is valid IANA timezone string.
      effect: 
        - Creates new Profile.
        - Sets includeRating to true (default).
        - Sets updatedAt to current time.
        - Returns the profile.

    updateDisplayName(user: User, displayName: String)
      requires: 
        - Profile exists for user.
        - displayName is non-empty.
      effect: 
        - Updates profile.displayName.
        - Sets updatedAt to current time.

    updatePhoneNumber(user: User, phoneNumber: String)
      requires: 
        - Profile exists for user.
        - phoneNumber is valid E.164 format.
      effect: 
        - Updates profile.phoneNumber.
        - Sets updatedAt to current time.

    updateTimezone(user: User, timezone: String)
      requires: 
        - Profile exists for user.
        - timezone is valid IANA timezone string.
      effect: 
        - Updates profile.timezone.
        - Sets updatedAt to current time.

    updateRatingPreference(user: User, includeRating: Flag)
      requires: Profile exists for user.
      effect:
        - Updates profile.includeRating.
        - Sets updatedAt to current time.

    deleteProfile(user: User)
      requires: Profile exists for user.
      effect: Removes profile.

    _getProfile(user: User): Profile
      effect: Returns profile for user, or null if none exists.

    _getAllProfiles(): seq of Profile
      effect: Returns all profiles.

<concept_spec/>
