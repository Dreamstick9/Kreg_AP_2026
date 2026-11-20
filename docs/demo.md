# Kreg Lite demo (5 minutes)

## Before the demo

Use the latest `main` after today's build PRs have merged. On a fresh setup, create the database (skip this if `kreg` already exists), copy the example environment file, and set its `DATABASE_URL` to your local PostgreSQL login:

```sh
createdb kreg
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
cd client && npm install
```

The seed command deletes and recreates the demo user's monitors, so use a demo database or run it only when replacing those monitors is okay.

Open three terminals in the project folder. Run one command in each and leave them open:

```sh
npm run fake
```

```sh
npm run dev
```

```sh
cd client && npm run dev
```

Open these pages:

- `http://localhost:5173/login` — sign in as `demo@kreg.dev` / `demo1234`, then show `/dashboard`.
- `http://localhost:3000/status.html` — public status page; it needs no login.
- From the dashboard, click the **Fake Flaky** row to show its check history and incident after the detail page is available on the latest `main`.

Make sure **Fake Flaky** is UP before presenting. The fake target starts healthy. Check with `curl -i http://localhost:4000/flaky`; it should return HTTP 200. Each call below flips the target, so check its response before continuing.

## Present in order

| Time | What to do and say | What the audience should see |
| --- | --- | --- |
| 0:00–0:30 | **Madhav:** introduce Kreg Lite as a small app that checks websites, saves results, and shows status. | Dashboard and status page are ready. |
| 0:30–1:15 | **Dreamstick:** sign in and point out the monitor list and login. Add `Demo OK` with URL `http://localhost:4000/ok` and interval `10`. **Kabir:** briefly explain that user and monitor data are stored in PostgreSQL. | The seeded monitors appear. After submitting the form, `Demo OK` appears in the dashboard. |
| 1:15–1:45 | **Boomelio:** open the public status page and point out the public monitors, uptime, response time, and update time. | The public page loads without logging in; private monitors are absent. |
| 1:45–2:00 | **Madhav:** show `Fake Flaky` is healthy, then turn it off: `curl -s -X POST http://localhost:4000/toggle`. The response should say `healthy: false`. Explain that three failed checks are needed before DOWN. | The target now returns HTTP 503. |
| 2:00–3:00 | **Madhav:** wait for the checks and page refreshes; use the time to explain that checks run on a schedule. | Within about 45 seconds, Fake Flaky changes to DOWN. Its detail page shows a new incident. |
| 3:00–3:15 | **Madhav:** turn it back on with `curl -s -X POST http://localhost:4000/toggle`; the response should say `healthy: true`. | The target returns HTTP 200 again. |
| 3:15–4:00 | **Madhav:** wait for the next check and refresh; explain that a successful check resolves the incident. | Within about 25 seconds, the monitor is UP and the incident is resolved. |
| 4:00–5:00 | **Boomelio:** explain one query or the status page; **Kabir:** take database questions; **Dreamstick:** take authentication questions; **Madhav:** take checker questions. | The audience sees the recovered monitor and its saved history. |

The fake target is a local, predictable demo endpoint. A public URL can also be checked, but the checker only tests the HTTP response; it does not sign in to a site or inspect its page contents.

Presenter ownership: Dreamstick covers login and JWT; Kabir covers the database and registration route; Madhav covers the checker; Boomelio covers SQL and the status page.
