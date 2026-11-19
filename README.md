# Kreg Lite

## What it is

Kreg Lite is a self-hosted uptime monitor for websites and APIs. It checks configured URLs on a schedule, records response times and incidents, and provides authenticated and public status views.

## Requirements

- Git
- Node.js 18 or newer, with npm
- PostgreSQL 16

## Setup

1. Fork [Dreamstick9/Kreg_AP_2026](https://github.com/Dreamstick9/Kreg_AP_2026) on GitHub.
2. Clone your fork. Replace `YOUR_GITHUB_USERNAME` with your GitHub username.

   ```sh
   git clone https://github.com/YOUR_GITHUB_USERNAME/Kreg_AP_2026.git
   ```

3. Change into the cloned project directory.

   ```sh
   cd Kreg_AP_2026
   ```

4. Add the original repository as the upstream remote.

   ```sh
   git remote add upstream https://github.com/Dreamstick9/Kreg_AP_2026.git
   ```

5. Create your local environment file.

   ```sh
   cp .env.example .env
   ```

6. Edit `DATABASE_URL` in `.env` to match your local PostgreSQL 16 user, password, host, port, and database. For example:

   ```text
   DATABASE_URL="postgresql://YOUR_POSTGRES_USER:YOUR_POSTGRES_PASSWORD@localhost:5432/kreg?schema=public"
   ```

7. Install the API dependencies.

   ```sh
   npm install
   ```

8. Apply the database migrations.

   ```sh
   npx prisma migrate dev
   ```

9. Create the demo user and seeded monitors.

   ```sh
   npx prisma db seed
   ```

## Run

Start each command in its own terminal from the project directory.

**Terminal 1 — fake monitor targets**

```sh
npm run fake
```

**Terminal 2 — API server**

```sh
npm run dev
```

The API health check is at [http://localhost:3000/healthz](http://localhost:3000/healthz). It returns `{"ok":true}` when the API can reach PostgreSQL.

**Terminal 3 — React client**

```sh
cd client && npm install && npm run dev
```

Open [http://localhost:5173/login](http://localhost:5173/login) and sign in with the demo login below to see the seeded monitors.

## Demo login

```text
Email: demo@kreg.dev
Password: demo1234
```

## Team

| Name | GitHub |
|---|---|
| Kushagar | [@Dreamstick9](https://github.com/Dreamstick9) |
| Kabir | [@kabirvashisht4-glitch](https://github.com/kabirvashisht4-glitch) |
| Madhav | [@Madhav-GPT](https://github.com/Madhav-GPT) |
| Boomelio | [@boomelio](https://github.com/boomelio) |

[Heartbeat daily tasks](https://dreamstick9.github.io/heartbeat/)
