# API Route Inventory

This is the current server route surface. It is a compatibility contract for incremental refactors.

## Legacy Auth

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | No | Legacy username/password registration. |
| POST | `/api/auth/login` | No | Legacy username/password login. |

## Versioned Auth And Account

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | No | Register and return token plus public user. |
| POST | `/api/v1/auth/password-login` | No | Password login and token issue. |
| POST | `/api/v1/auth/wechat-login` | No | WeChat login or dev mock login. |
| POST | `/api/v1/auth/phone-login` | No | WeChat phone login or dev mock phone login. |
| POST | `/api/v1/auth/send-reset-code` | No | Send or mock a password reset code. |
| POST | `/api/v1/auth/reset-password` | No | Reset password. |
| POST | `/api/v1/auth/set-password` | Bearer token | Set or change password. |
| GET | `/api/v1/me` | Bearer token | Return current public user. |
| PATCH | `/api/v1/me` | Bearer token | Update profile fields. |
| DELETE | `/api/v1/me` | Bearer token | Delete account and related data. |
| PUT | `/api/v1/me/settings` | Bearer token | Save app settings. |
| GET | `/api/v1/me/settings` | Bearer token | Load app settings. |

## Legacy Domain Sync

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/cats/:userId` | No | Load user cats. |
| POST | `/api/cats` | No | Save or update a cat. |
| DELETE | `/api/cats/:userId/:catId` | No | Delete one cat. |
| DELETE | `/api/cats/:userId` | No | Delete all user cats. |
| GET | `/api/diaries/:userId` | No | Load user diaries. |
| POST | `/api/diaries` | No | Save or update a diary. |
| DELETE | `/api/diaries/:userId/:diaryId` | No | Delete a diary. |
| GET | `/api/letters/:userId` | No | Load user letters. |
| POST | `/api/letters` | No | Save or update a letter. |
| DELETE | `/api/letters/:userId/:letterId` | No | Delete a letter. |
| GET | `/api/points/:userId` | No | Load points. |
| POST | `/api/points` | No | Save points. |
| POST | `/api/points/:userId/transaction` | No | Add a point transaction. |

## Versioned Domain Sync

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/cats` | Bearer token | Load current user's cats. |
| POST | `/api/v1/cats` | Bearer token | Save or update a cat. |
| DELETE | `/api/v1/cats/:catId` | Bearer token | Delete one cat. |
| DELETE | `/api/v1/cats` | Bearer token | Delete all current user's cats. |
| GET | `/api/v1/diaries` | Bearer token | Load current user's diaries. |
| POST | `/api/v1/diaries` | Bearer token | Save or update a diary. |
| DELETE | `/api/v1/diaries/:diaryId` | Bearer token | Delete a diary. |
| POST | `/api/v1/diaries/:diaryId/like` | Bearer token | Toggle diary like. |
| POST | `/api/v1/diaries/:diaryId/comments` | Bearer token | Add diary comment. |
| DELETE | `/api/v1/diaries/:diaryId/comments/:commentId` | Bearer token | Delete diary comment. |
| GET | `/api/v1/letters` | Bearer token | Load current user's letters. |
| POST | `/api/v1/letters` | Bearer token | Save or update a letter. |
| DELETE | `/api/v1/letters/:letterId` | Bearer token | Delete a letter. |
| GET | `/api/v1/points` | Bearer token | Load points. |
| POST | `/api/v1/points` | Bearer token | Save points. |
| POST | `/api/v1/points/transaction` | Bearer token | Add a point transaction. |

## Friends, Notifications, Feedback, Upload

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/v1/friend-invites` | Bearer token | Create friend invite. |
| GET | `/api/v1/friend-invites/:code` | Bearer token | Resolve friend invite. |
| GET | `/api/v1/friends` | Bearer token | Load friend list. |
| POST | `/api/v1/friends/accept` | Bearer token | Accept invite. |
| GET | `/api/v1/friends/diaries` | Bearer token | Load friend diaries. |
| GET | `/api/v1/notifications` | Bearer token | Load notifications. |
| POST | `/api/v1/notifications` | Bearer token | Create notification. |
| PUT | `/api/v1/notifications/:id/read` | Bearer token | Mark notification read. |
| PUT | `/api/v1/notifications/read-all` | Bearer token | Mark all notifications read. |
| POST | `/api/v1/feedback` | Bearer token | Save feedback. |
| POST | `/api/v1/upload` | Bearer token | Upload avatar or image file. |

## Admin

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/admin/stats` | `X-Admin-Token` | Load admin dashboard metrics, users, and feedback. |
| POST | `/api/v1/admin/users/:userId/points` | `X-Admin-Token` | Adjust a user's points balance. |
| DELETE | `/api/v1/admin/users/:userId` | `X-Admin-Token` | Delete a user and related data. |
| DELETE | `/api/v1/admin/feedback/:id` | `X-Admin-Token` | Delete a feedback entry. |

## AI, Proxies, Assets, Health

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | No | Server health check. |
| GET | `/api/temp-file/:id` | No | Serve temporary in-memory file. |
| POST | `/api/ai/generate-image` | No | Provider-aware image task. |
| POST | `/api/ai/generate-video` | No | Provider-aware video task. |
| GET | `/api/ai/:type(image\|video)-status/:provider/:taskId` | No | Provider-aware task polling. |
| POST | `/api/v1/ai/tasks` | Bearer token | Versioned image/video task. |
| POST | `/api/v1/ai/tasks-file` | Bearer token | Versioned file-based image/video task. |
| GET | `/api/v1/ai/tasks/:taskId` | Bearer token | Versioned task polling. |
| POST | `/api/generate-image` | No | Legacy DashScope image task. |
| GET | `/api/:type(image\|video)-status/:taskId` | No | Legacy DashScope task polling. |
| POST | `/api/generate-video` | No | Legacy DashScope video task. |
| GET | `/api/proxy-resource` | No | Proxy remote media/resource. |
| GET | `/api/proxy-video` | No | Compatibility redirect to resource proxy. |
| POST | `/api/persist-video` | No | Legacy video persistence. |
| POST | `/api/v1/assets/persist-video` | Bearer token | Authenticated video persistence. |

## Known Follow-Up Risks

- Legacy non-authenticated write routes need a client audit before removal or protection.
- Proxy and persistence routes need URL validation before production exposure.
- AI error responses should hide internal request details in production.
