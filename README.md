# GoldHour

**The studio desk for wedding photographers.** Now with accounts, a TypeScript API, Postgres, and Razorpay billing.

Live: [goldhour-chi.vercel.app](https://goldhour-chi.vercel.app)

- **Start a studio:** `/signup` — 14-day trial, data on the server
- **Demo:** `/login` → PIN `2026` (Meenakshi Frames, Madurai)
- **Subscribe:** `/studio/billing` — Razorpay, ₹799 / ₹1,499 a month

## What a photographer can do

1. Sign up and keep leads on their own account
2. Enquiry → personalised quote PDF → WhatsApp follow-up → booked
3. Track advance / before wedding / final delivery
4. Pay GoldHour with Razorpay after the trial

## Run locally

```bash
cp .env.example .env.local
# optional: set DATABASE_URL (Neon). Without it, local data is `.data/goldhour.json`
npm install
npm run dev
```

UI: http://localhost:5173 · API: http://localhost:8788

## Production env (Vercel)

| Variable | Why |
| --- | --- |
| `DATABASE_URL` | Neon Postgres |
| `JWT_SECRET` | Session cookies |
| `RAZORPAY_KEY_ID` | Checkout |
| `RAZORPAY_KEY_SECRET` | Orders + signature |
| `RAZORPAY_WEBHOOK_SECRET` | `https://goldhour-chi.vercel.app/api/billing/webhook` |

## License

Proprietary. All rights reserved. See `LICENSE`.
