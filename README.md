# Pleasure Cooling Care

Booking platform for a home appliance repair and installation business (AC, refrigerator, washing machine, geyser) in Bareilly and Pilibhit, Uttar Pradesh.

- **Customers** book with a mobile number (no account), track and cancel bookings, claim a guarantee re-service and leave a review.
- **Admin** (`/admin`) manages services and prices, coverage districts, technicians, bookings, guarantee claims, reviews, finance and the SMS log.
- **Technicians** (`/technician`) log in with work email and PIN, work their own jobs and see their earnings.

Next.js 14 (App Router), TypeScript, Tailwind + shadcn/ui, PostgreSQL with Prisma 6, MSG91 SMS. Business logic lives in `src/lib/domain/*` (no framework imports) so forms, API routes and future AI agents share it.

## Setup

```bash
npm install
cp .env.example .env   # fill in the values
npm run db:deploy      # apply migrations
npm run db:seed        # coverage areas, settings and starter AC services
npm run dev
```

`npm test` runs the unit tests. `npm run build` type-checks and builds.

## Notes

- Use a PostgreSQL 16+ database with UTF-8 encoding. `DATABASE_URL` is the pooled connection, `DIRECT_URL` the direct one used by migrations.
- SMS needs an MSG91 account with DLT-registered templates. Template texts are in `src/constants/sms.ts`; set the matching `MSG91_TEMPLATE_*` ids. Without them messages are logged as "Not sent".
- Contact details and business name are in `src/constants/business.ts`; the owner background on `/about` is in `src/constants/about.ts`.

docker start pcc-test-pg
npm install
npm run db:deploy
npm run dev