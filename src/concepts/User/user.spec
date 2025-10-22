<concept_spec>
	concept UserConcept

	purpose
    Represent unique user identities in the system

  principle
    Each user has a unique identifier that persists across sessions and serves 
    as the anchor for all user-specific data across concepts.

  state
    a set of Users with
      a createdAt DateTime

  actions
    createUser(): User
      effect: 
        - Creates new User with fresh ID.
        - Sets createdAt to current time.
        - Returns the user.

    deleteUser(user: User)
      requires: user exists.
      effect: Removes user.

    _getUser(user: User): User
      effect: Returns user if exists, or error if not found.

    _getAllUsers(): seq of User
      effect: Returns all users ordered by createdAt.

<concept_spec/>
