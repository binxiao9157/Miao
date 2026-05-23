# Frontend Routes And Key Flows

## Public Routes

| Path | Component | Notes |
| --- | --- | --- |
| `/login` | `Login` | Redirects authenticated users to `/` or `/empty-cat`. |
| `/register` | `Register` | Redirects authenticated users to `/` or `/empty-cat`. |
| `/reset-password` | `ResetPassword` | Redirects authenticated users to `/` or `/empty-cat`. |
| `/terms` | `TermsOfService` | Public legal page. |
| `/download` | `Download` | Public install/download page. |
| `/privacy-policy` | `PrivacyPolicy` | Public legal page. |

## Protected Onboarding And Special Routes

| Path | Component | Notes |
| --- | --- | --- |
| `/empty-cat` | `EmptyCatPage` | Only useful when the user has no cat. |
| `/welcome` | `Welcome` | Onboarding. |
| `/upload-material` | `UploadMaterial` | Upload source image. |
| `/create-companion` | `CreateCompanion` | Create from preset/source. |
| `/generation-progress` | `GenerationProgress` | AI generation orchestration. |
| `/cat-player/:id` | `CatPlayer` | Cat media playback. |
| `/cat-history` | `CatHistory` | Cat history list. |
| `/accompany-milestone` | `AccompanyMilestonePage` | Milestone view. |

## Protected Main Tabs

These routes render inside `MainLayout` and keep visited tab state alive.

| Path | Page | Tab Label |
| --- | --- | --- |
| `/` | `Home` | 首页 |
| `/diary` | `Diary` | 日志 |
| `/time-letters` | `TimeLetters` | 时光 |
| `/notifications` | `NotificationList` | Notifications |
| `/points` | `Points` | 积分 |
| `/profile` | `Profile` | Miao |

## Protected Settings And Detail Routes

| Path | Component |
| --- | --- |
| `/edit-profile` | `EditProfile` |
| `/change-password` | `ChangePassword` |
| `/notification-settings` | `Notifications` |
| `/privacy-settings` | `PrivacySettings` |
| `/set-nickname` | `SetNickname` |
| `/switch-companion` | `SwitchCompanion` |
| `/add-friend-qr` | `AddFriendQR` |
| `/scan-friend` | `ScanFriend` |
| `/join-friend` | `ScanFriend` |
| `/feedback` | `Feedback` |
| `/admin-settings` | `AdminSettings` |

## Core Flows To Preserve

### First Cat Creation

1. User registers or logs in.
2. User is sent to `/empty-cat` when no cat exists.
3. User chooses upload or preset creation.
4. User reaches `/generation-progress`.
5. Image and video tasks run through `VolcanoService` and `aiClient`.
6. Cat data is saved through `FileManager` and `storage`.
7. User returns to Home with generated media available.

### Diary Posting

1. User opens `/diary`.
2. Page loads active cat, own diaries, and friend diaries.
3. User creates a diary entry with optional media.
4. Media may be stored in IndexedDB.
5. Diary metadata is stored locally and synced to the server.
6. Diary events refresh profile/notification counters.

### Friend Invite

1. User opens `/add-friend-qr`.
2. Client creates an invite through `friendService`.
3. QR/deep link points to `/join-friend` or `/scan-friend`.
4. Receiver accepts invite through versioned friend APIs.
5. Friend list and friend diaries are refreshed.

### Time Letter Unlock

1. User creates a time letter for a cat.
2. Unlock timing is computed through `timeLetterUnlock`.
3. Notifications derive from local letter state plus fast-forward/debug flags.
4. Read markers are stored locally.
