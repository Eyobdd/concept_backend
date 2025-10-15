```
<concept_spec>
	concept CallWindowConcept[User]

	purpose
    Define a user's availability for receiving calls

  principle
    This concept manages the windows of time when a user is available for calls, supporting both recurring weekly schedules and specific one-off date-based availabilities.

  state
    # A User has a set of windows defining their availability
    a set of Users with
      a set of CallWindows

    # A CallWindow is a generic concept for availability
    a set of CallWindows with
      a user User
      a startTime DateTime
      a endTime DateTime

    # A Recurring window applies every week on a given day
    a RecurringWindows set of CallWindows with
      a dayOfWeek of MONDAY or TUESDAY or WEDNESDAY or THURSDAY or FRIDAY or SATURDAY or SUNDAY

    # A specific override or one-off window for a particular date
    a OneOffWindows set of CallWindows with
      a specificDate Date

  actions
    createRecurringCallWindow(user:User, dayOfWeek: MONDAY or TUESDAY or WEDNESDAY or THURSDAY or FRIDAY or SATURDAY or SUNDAY, startTime: DateTime, endTime:DateTime): CallWindow
      requires: 
        - The endTime must be later than the startTime.
        - There is no existing RecurringWindow rw for the user such that rw.dayOfWeek = dayOfWeek and rw.startTime = startTime.
      effect:
        - A new CallWindow, cw_new, is added to the CallWindows set and the RecurringWindows subset.
        - cw_new is added to the user.callWindows relation.
        - cw_new.user is set to the input user.
        - cw_new.dayOfWeek is set to the input dayOfWeek.
        - cw_new.startTime is set to the input startTime.
        - cw_new.endTime is set to the input endTime.
        - The action returns cw_new.
  
    createOneOffCallWindow(user:User, specificDate :Date, startTime:DateTime, endTime: DateTime): CallWindow
      requires: 
        - The endTime must be later than the startTime.
        - There is no existing OneOffWindow ow for the user such that ow.specificDate = specificDate and ow.startTime = startTime.
      effect:
        - A new CallWindow, cw_new, is added to the CallWindows set and the OneOffWindows subset.
        - cw_new is added to the user.callWindows relation.
        - cw_new.user is set to the input user.
        - cw_new.specificDate is set to the input specificDate.
        - cw_new.startTime is set to the input startTime.
        - cw_new.endTime is set to the input endTime.
        - The action returns cw_new.

    deleteRecurringCallWindow(user:User, dayOfWeek: MONDAY or TUESDAY or WEDNESDAY or THURSDAY or FRIDAY or SATURDAY or SUNDAY, startTime: DateTime)
      requires: 
        - There exists a RecurringWindow rw such that rw.user = user, rw.dayOfWeek = dayOfWeek, and rw.startTime = startTime.
      effect:
        - The window rw is removed from the CallWindows set (and by extension, the RecurringWindows subset).
        - The window rw is removed from the user.callWindows relation.

    deleteOneOffCallWindow(user:User, specificDate: Date, startTime: DateTime)
      requires: 
        - There exists a OneOffWindow ow such that ow.user = user, ow.specificDate = specificDate, and ow.startTime = startTime.
      effect:
        - The window ow is removed from the CallWindows set (and by extension, the OneOffWindows subset).
        - The window ow is removed from the user.callWindows relation.

<concept_spec/>
```