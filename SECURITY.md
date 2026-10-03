# GoldHour security (Phase 1)

Studio data is isolated by the signed-in user. There is no `/api/leads/:id` — a photographer can only read/write **their own** studio blob from the session cookie.

## In production now

- Email + password with **scrypt** (not SHA-256, not plaintext)
- HttpOnly + Secure + SameSite=Lax session cookie
- Session id in JWT; **logout and password reset revoke sessions**
- 7-day session expiry
- 5 failed logins / 15 minutes (also IP cap)
- Studio PUT cannot change `userId` / `studio.id`
- Input validation + size cap on desk saves
- HQ-only `/api/admin/*` (403 otherwise)
- Generic 500s with an error id (`GH-…`)
- Audit log on this desk (`/studio/activity`) and HQ (`/api/admin/audit`)
- Security headers: nosniff, frame deny, referrer, HSTS, permissions-policy
- Forgot password + email confirm (needs `RESEND_API_KEY` to mail the photographer; otherwise HQ is copied)

## Not yet (later phases)

Google login, MFA, team RBAC (editor/accountant), signed photo URLs, Argon2id, backups UI, Copilot.

Set `RESEND_API_KEY` and `MAIL_FROM` on Vercel when you want reset/verify mail to hit the studio inbox directly.
