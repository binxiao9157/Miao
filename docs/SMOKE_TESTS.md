# Manual Smoke Test Checklist

Run this checklist after each refactor stage. It is intentionally user-visible and does not depend on a test framework.

## Setup

- Install dependencies when `npm` is available: `npm ci`.
- Create `.env.local` or `.env` from `.env.example`.
- Start the app: `npm run dev`.
- Open `http://localhost:3000`.

## Auth

- Register a new username/password account.
- Log out and log back in with the same account.
- Try a wrong password and confirm the login error path still works.
- Change password from Profile settings and log in with the new password.

## Cat Creation And Playback

- Create a cat from an uploaded image.
- Create or select a preset cat.
- Confirm `/generation-progress` can resume or fail gracefully.
- Confirm Home plays the idle video or fallback image.
- Switch companions and confirm the active cat changes across Home, Diary, and Profile.

## Diary

- Create a text-only diary.
- Create a diary with an image.
- Create a diary with a video if a small test video is available.
- Like and unlike a diary.
- Add and delete a comment.
- Confirm Profile diary counts update after diary changes.

## Time Letters

- Create a future time letter.
- Confirm it appears locked before unlock time.
- Use existing debug/fast-forward behavior when available.
- Confirm notification counters update after read.

## Points

- Open Points and confirm total/history render.
- Trigger a daily interaction or existing points event.
- Confirm offline queue behavior after reconnect if testing in browser devtools.

## Friends

- Create a friend QR/invite.
- Open the join/scan route with the invite code.
- Accept the invite.
- Confirm friends and friend diaries render.

## PWA And Media

- Reload after service worker registration.
- Confirm no reload loop occurs.
- Play generated/persisted video after reload.
- Confirm image/video assets still load through proxy fallback where applicable.

## Admin/Debug

- Open the hidden admin settings path if enabled by the UI.
- Switch AI provider/model settings.
- Reset settings and confirm defaults are restored.
