# GoldHour

**The studio desk for wedding photographers.**

GoldHour is software for the people who make money from weddings — photographers, cinematographers, décor, makeup, planners — not another app for brides.

India’s wedding market is enormous. Most small studios still run the business on WhatsApp, Excel, phone calls and notebooks. GoldHour is the desk that sits beside the camera.

Live demo: [kuttenajith.github.io/goldhour](https://kuttenajith.github.io/goldhour)

Studio PIN: `2026` · Demo studio: **Meenakshi Frames, Madurai**

## What it does (v1)

1. **Leads** — name, phone, event date, budget, service, source, status
2. **Quotations** — professional gold-on-black PDF letterhead
3. **Follow-ups** — today, tomorrow, after 7 days
4. **Payments** — total, advance, balance
5. **WhatsApp** — send quotation, payment reminder, event reminder

No backend. Your demo data lives in the browser. Reset it from Payments.

## Who pays

The vendor.

| Plan | Price |
| --- | --- |
| Starter | ₹499 / month |
| Professional | ₹999 / month |
| Business | ₹1,999 / month |

## Run locally

```bash
bun install
bun dev
```

Open [http://localhost:5173](http://localhost:5173).

## Deploy

Push to `main`. GitHub Actions publishes GitHub Pages at `/goldhour/`.

## License

Proprietary. All rights reserved. See `LICENSE`.
