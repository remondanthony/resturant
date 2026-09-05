# TAVOLO

A modern Italian restaurant website with a database-backed booking system and a
staff dashboard. **Phases 1–4.**

Built on Next.js 16 (App Router) with TypeScript, Tailwind CSS v4 and Turbopack.
Server Components by default; `"use client"` appears only where the browser is
genuinely required.

## Getting started

```bash
npm install
cp .env.example .env.local     # then fill in DATABASE_URL and SESSION_SECRET
npm run setup                  # migrate + seed the dining room
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-password' npm run staff:add
npm run dev                    # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | the app |
| `npm run lint` | ESLint |
| `npm run test` | unit tests for the booking logic (no database needed) |
| `npm run test:db` | integration checks against a real database |
| `npm run db:generate` | create a migration from schema changes |
| `npm run db:migrate` | apply pending migrations |
| `npm run db:seed` | seed tables and default booking rules (safe to re-run) |
| `npm run db:studio` | browse the database |
| `npm run staff:add` | create or reset a staff login |

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string (Neon) |
| `SESSION_SECRET` | yes | signs the staff session cookie; 32+ chars, `openssl rand -base64 32` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | only for `staff:add` | pass inline, never commit |
| `TAVOLO_ENQUIRY_ENDPOINT` | no | where contact and private dining enquiries are POSTed |

## Structure

```
app/                 Home, Menu, About, Gallery, Private Dining, Contact,
                     Reservations, 404, and the form server actions
components/layout/   Navbar, DesktopNav, MobileMenu, ReserveButton, Footer,
                     Wordmark, PagePlaceholder
components/ui/       Button, TextLink, SectionHeading, ImageWithFallback,
                     PageHero, EditorialSplit, NumberedList
components/home/     One component per homepage section
components/menu/     MenuSection, MenuItem, MenuCategoryNav
components/gallery/  GalleryGrid (shared by the homepage and gallery page)
components/contact/  MapPlaceholder
components/forms/    Field, SubmitButton, FormStatusMessage, ContactForm,
                     PrivateDiningForm
data/                Menu (single source of truth for every dish), gallery,
                     about, experience and private dining content
lib/                 Site config, price formatting, form validation, the
                     enquiry delivery seam
public/images/       Designed placeholder plates (generated — see below)
scripts/             Placeholder generator
```

## Content is placeholder

Dishes, prices, address, phone, email and hours are stand-ins. The menu and
gallery pages say so on the page itself, and no chef names, awards, press or
history are invented anywhere. Replace the values in `lib/site.ts` and `data/`
when the real information arrives.

Prices are formatted from `menuCurrency` / `menuLocale` in `data/menu.ts`. They
are currently `GBP` / `en-GB` to match the placeholder London address — change
those two values to switch the whole site to another currency.

## The booking system

There is exactly one reservation engine and one availability engine. The public
booking flow and the staff dashboard both go through them:

```
Customer booking ─┐
                  ├─→ lib/booking/reservations.ts ─→ lib/booking/availability.ts ─→ database
Staff booking ────┘
```

`lib/booking/availability.ts` is the only place that decides whether a slot can
be taken. `assertSlotBookable()` is called by every write path.

Double-booking is prevented **in the database**, not in application code. A
Postgres exclusion constraint (`drizzle/0001_no_double_booking.sql`) makes
overlapping live reservations on one table impossible, so two simultaneous
requests cannot both succeed — the loser gets a clear "that table was just
taken" message. `npm run test:db` proves this by bypassing the application
check entirely.

Booking rules (hours, horizon, turn times, party limits, slot interval) live in
`lib/booking/config-defaults.ts` as defaults and in the `settings` row once
saved from `/admin/settings`. Everything reads `getBookingConfig()`.

## Staff dashboard

`/admin`, protected by two independent layers:

1. `proxy.ts` — a cheap cookie check that keeps signed-out traffic out. It is an
   optimisation, **not** the security boundary.
2. `lib/auth/dal.ts` — `requireStaff()` runs inside every admin page and every
   admin Server Action, re-checking the session against the database so a
   deactivated account stops working immediately.

Passwords are hashed with scrypt (`lib/auth/password.ts`); sessions are
HMAC-signed cookies (`lib/auth/session.ts`), httpOnly and unreadable by client
JavaScript. There is no sign-up — accounts are created with `npm run staff:add`.

Table status on the floor plan is **derived** from reservations and blocks
(`lib/booking/floor.ts`), never stored, so it cannot drift out of step with the
book.

## Two booking experiences

```
NORMAL           guest picks: date → guests → time
                 staff pick:  the table
                 arrives as:  PENDING, table_id NULL

PRIVATE DINING   guest picks: date → guests → room → time
                 arrives as:  PENDING, table_id set
```

Guests booking a normal table never see a table name — the booking page does
not receive one. They are booking dinner, not managing the floor plan. Private
dining is the exception: choosing the room is part of that booking, so only
tables flagged `is_private_dining` are offered there.

`table_id` is nullable, and the exclusion constraint carries an explicit
`table_id IS NOT NULL` predicate: an unassigned request holds no table and
blocks nobody. Assigning a table re-checks availability and confirms the
booking in one step.

## Guest mobile numbers

The mobile number is the contact of record. It is normalised to E.164 on the
way in (`lib/booking/phone.ts`), with India as the default country, so
"98765 43210", "+91 98765 43210" and "098765 43210" all store as
`+919876543210`.

Lists show it masked — `+91 98XXXXXX10` — and the full number appears only on
the reservation detail page, behind staff authentication. It is never returned
by a public action.

## Notifications

```
staff confirm → notification service → provider → guest
                        ↓
                 notifications table (every attempt recorded)
```

**No messaging provider is connected.** `resolveProvider()` returns a mock that
logs what would have been sent and records the attempt as `simulated`; the
dashboard labels it "Simulated — not delivered". Nothing anywhere claims a
message was sent.

To connect one: implement `NotificationProvider` in
`lib/notifications/provider.ts`, return it from `resolveProvider()`, and set
`SMS_PROVIDER` plus the provider's credentials in the environment. No call site
changes.

A booking never depends on a message. Delivery is attempted after the
reservation is committed, and a failure is written to the notifications table
with a retry button — it never changes the reservation's status.

## Reservation status

A reservation has exactly one status, and it lives in the `status` column:

```
PENDING → CONFIRMED → SEATED → COMPLETED
   │          │          │
   │          │          └──→ NO SHOW
   └──────────┴──→ CANCELLED
```

A normal booking arrives `PENDING` and becomes `CONFIRMED` when staff assign a
table. Staff bookings and confirmations skip straight to `CONFIRMED`.

`SEATED` is a real status, not a flag layered on top of `CONFIRMED`. Every
view — dashboard, list, day and week, detail, search, floor plan — renders
`StatusBadge` from that one column, so they cannot disagree.

`arrived_at`, `completed_at`, `cancelled_at` and `no_show_at` still exist, but
purely as audit timestamps. Nothing reads them to decide what to display.

Two consequences worth remembering:

- **`seated` occupies a table.** It appears in `OCCUPYING_STATUSES` *and* in the
  `reservations_no_overlap` exclusion constraint. Those two lists must stay in
  step — a seated guest is sitting at the table, so their booking must keep
  blocking the slot. `npm run test:db` has a regression test for exactly this.
- **Actions are contextual.** The reservation list offers only `View`; the
  transitions live on the detail page and only the ones valid for the current
  status are shown.

## Realtime dashboard updates

Open dashboards update themselves when a booking is made, changed or cancelled
— by a guest, by another staff member, or by anything else that writes to the
database.

```
customer or staff writes
        ↓
  COMMIT in Postgres
        ↓
  AFTER trigger → pg_notify('tavolo_changes', {entity, op, id})
        ↓
  LISTEN session (lib/realtime/listener.ts)
        ↓
  SSE stream  (app/admin/stream/route.ts, staff only)
        ↓
  dashboard calls router.refresh()
        ↓
  existing Server Components re-render from the database
```

Three properties fall out of doing it this way:

- **The database is the only source of truth.** The trigger fires after COMMIT,
  so a rolled-back booking is never announced. The stream is a signal, not
  data: the dashboard always re-reads from Postgres.
- **Nothing can appear twice.** The reservation list is a query result, not an
  accumulation of events, so a repeated delivery cannot duplicate a row.
  Toasts are separately deduplicated by entity, row id and operation.
- **Any writer works.** Because the trigger lives in the database, a booking
  made by a customer, by staff, or by a direct SQL statement all reach every
  dashboard identically.

The channel carries only `{entity, op, id}` — no guest data. The authenticated
stream reads the row back and sends the staff member a name, party size, table
and time. Email, phone and special requests are never pushed.

Connection loss is handled: the client watches for a heartbeat, shows
`Reconnecting`, and on reconnect resyncs from the database so nothing that
happened during the gap is missed.

### Requirements

- **A session-scoped connection.** Neon's pooled endpoint runs PgBouncer in
  transaction mode, which does not carry `LISTEN` — set `DATABASE_URL_UNPOOLED`
  to the direct connection string there. Locally the two are the same.
- **A persistent Node process.** The listener and the SSE stream are long-lived,
  so this needs a server that stays resident (a container, a VM, a long-running
  Node host) rather than a per-request serverless function. Everything else in
  TAVOLO is serverless-friendly; only this feature is not.

If the stream cannot connect, the dashboard still works — it simply stops being
pushed to, and resyncs whenever it navigates or reconnects.

## Motion

One scale, applied everywhere, declared in the `@theme` block:

| Step | Duration | Used for |
| --- | --- | --- |
| press | 120ms | the moment a control is pushed |
| ui | 180ms | hover, focus, active state, status change |
| surface | 260ms | dialogs, toasts, things that enter and leave |
| entrance | 420ms | larger elements arriving |
| editorial | 700ms | marketing image reveals only |

`--default-transition-duration` is set to the ui step, so a bare
`transition-colors` lands on the scale without anyone having to write a
duration. Anything outside these values is a mistake, not a decision.

Two easing curves: `--ease-out-expo` for entrances, `--ease-standard` for state
changes. Native `<dialog>` elements animate in *and out* via `overlay` and
`display` in the transition list with `transition-behavior: allow-discrete`.

Booking steps animate in at the ui step. Only opacity and transform move —
never height — so the layout settles instantly and the motion is continuity
rather than a reflow the guest waits through (measured CLS 0.0000).

Everything collapses under `prefers-reduced-motion`.

## Design tokens

Every colour, typeface, container width, radius, shadow and easing curve lives
in the `@theme` block at the top of `app/globals.css`. Components reference
tokens through Tailwind utilities and never hard-code a raw value.

## Images

`components/ui/ImageWithFallback.tsx` is the only way images enter the page. It
covers all four states — missing source, loading, loaded, failed — inside a
frame that always reserves its aspect ratio, so the browser's broken-image icon
is unreachable and nothing shifts as images arrive.

The files in `public/images` are **designed placeholders**, not stock
photography: warm espresso washes with a single key light, film grain and a
faint hairline motif. Regenerate them with:

```bash
node scripts/generate-placeholders.mjs
```

Replace them with real photography as it is commissioned; delete a placeholder
from the generator once its real image lands.

## Forms

The contact and private dining forms validate on the server inside a form
action (`app/actions.ts`), so validation, error messages and the loading state
work with or without JavaScript, and there is one implementation rather than
two.

Delivery is a seam: `lib/enquiries.ts` POSTs the enquiry as JSON to
`TAVOLO_ENQUIRY_ENDPOINT`. With no endpoint set — the current state — nothing is
sent and the form says exactly that, offering the phone number and email
instead. It never claims a message reached the restaurant. Set the environment
variable (see `.env.example`) and the success state takes over; no component
changes are needed.

## Motion

Section reveals are CSS scroll-driven animations behind
`@supports (animation-timeline: view())` and
`@media (prefers-reduced-motion: no-preference)`. Browsers without support, and
anyone who prefers reduced motion, get the final state immediately. There is no
animation library and no scroll listener.

## Not built yet

`/reservations` is a landing page describing the booking flow. It does not check
availability, hold a table or take a payment, and the page says so. Table
availability, payments, authentication, the database and the admin dashboard are
later phases. Booking and deposit pricing will live in a central configuration
layer when it is built — do not put it in components.

## Production checklist

Work through this before pointing a domain at TAVOLO.

### Environment

- [ ] `DATABASE_URL` — production Postgres (Neon pooled connection string). Never the local one.
- [ ] `SESSION_SECRET` — a fresh 32+ character value, different from development. `openssl rand -base64 32`
- [ ] `site.url` in `lib/site.ts` — set to the real domain. Canonical URLs, the sitemap and `robots.txt` all read it.
- [ ] Real address, phone, email and opening hours in `lib/site.ts` (currently placeholders).
- [ ] Confirm no `.env*` file is committed — `.gitignore` already covers them.

### Database

- [ ] `npm run db:migrate` against production.
- [ ] Confirm the `reservations_no_overlap` exclusion constraint exists — it is what prevents double-booking.
- [ ] `npm run db:seed` once, then edit the real dining room at `/admin/tables`.
- [ ] Create staff logins with `npm run staff:add`. Use a strong password; there is no sign-up page by design.
- [ ] Take a backup schedule for the reservations table.

### Application

- [ ] `npm run build` succeeds.
- [ ] `npm run test` and `npm run test:db` pass against production-like settings.
- [ ] Booking rules reviewed at `/admin/settings` — hours, booking window, turn times, party limits.
- [ ] Sign in, book a table, confirm it appears on the dashboard.

### Security

- [ ] HTTPS enforced by the host so the session cookie's `Secure` flag applies.
- [ ] `/admin` returns a redirect when signed out.
- [ ] Verify `robots.txt` disallows `/admin`, and the `X-Robots-Tag` header is present on admin responses.
- [ ] Rotate `SESSION_SECRET` if it is ever exposed — this signs out all staff.

### Realtime

- [ ] `DATABASE_URL_UNPOOLED` set if the main URL is a pooled endpoint (Neon).
- [ ] Deployment target keeps a Node process resident — not per-request serverless.
- [ ] Sign in on two devices, book from the public site, confirm both update.

### Deployment

- [ ] Environment variables set on the platform, not in the repo.
- [ ] Database reachable from the deployment region.
- [ ] Submit `/sitemap.xml` once the domain is live.
- [ ] Add the real address and telephone to `components/seo/RestaurantSchema.tsx` — deliberately omitted while they are placeholders.
