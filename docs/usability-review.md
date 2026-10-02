# Usability review - 2026-10-02

## Fixed in this pass
- Chat follows the visible mobile-browser viewport and uses full-screen keyboard avoidance on native devices.
- Uses the device keyboard, including its emoji keyboard, without an app emoji tray.
- Conversation changes jump directly to the latest messages; short threads sit at the bottom.
- Drafts are separate for each conversation while the chat screen remains open.
- Sending has an in-flight guard, disabled empty send, progress indicator, and error feedback. Failed sends retain text.
- Server message IDs prevent duplicate optimistic messages and invalid read requests.
- Multiline input grows to a bounded height. Message text can be selected and copied; date separators clarify history.
- Mobile conversation tabs scroll horizontally with full names and 44px touch targets.
- Repeated header taps no longer stack the same chat/notification page; direct links have a home fallback for Back.
- Sync errors are visible on app pages and clear after a successful refresh.
- Empty teams/workers have next-step buttons in creation forms.

## Reviewed
Sign-in/reset validation and busy states, scan permission/error handling and duplicate-scan guard, creation-form validation, shared navigation, notification dismissal, desktop and mobile chat structure.

## Remaining release checks and limitations
- Real iOS Safari, Android Chrome, and native keyboard/emoji switching require device validation. Compilation does not establish keyboard correctness on all devices.
- Group-message read status is one shared database field, not per recipient. Reliable per-user unread counts require a database migration. Current header badge only counts direct messages.
- Admin clock-in notifications are in-app and refresh through the 12-second sync. Background push delivery is not implemented.
- Notification dismissals are per account on this device; they do not sync across devices.
- Admin edits are optimistic; a failed save can roll back after navigation. Visible sync feedback now exposes the failure, but awaited saves and form recovery need a broader store/API change.
- No visual browser review was completed in this environment. Translations for newly added copy also need review.
