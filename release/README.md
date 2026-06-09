# EfficiencyMemo

A self-hosted productivity tool gallery that runs entirely in Docker.

**Looking for the desktop app?** The recommended way to use EfficiencyMemo is now the [Tauri desktop app](../apps/desktop/README.md) — no Docker required. This Docker release is preserved as a web-only fallback.

## Quick Start

1. Generate secrets and append them to your environment file:

   ```bash
   bash scripts/generate-keys.sh >> .env.docker
   ```

2. Start the entire stack with the setup script:

   **macOS / Linux**
   ```bash
   bash scripts/setup.sh
   ```

   **Windows**
   ```powershell
   pwsh scripts/setup.ps1
   ```

3. Open the app in your browser:

   ```
   http://localhost:3000
   ```

The setup script checks that Docker is installed, validates your `.env.docker` file, and starts all services. First launch may take a minute while images download.

---

## What's Included

The Docker Compose stack runs seven services:

| Service | Description | Port |
|---|---|---|
| Next.js | The EfficiencyMemo web app | 3000 |
| Auth (GoTrue) | Supabase authentication API | 54321 |
| Postgres | Database (internal Docker network) | internal |
| Studio | Supabase management dashboard | 54323 |
| Inbucket (Web) | Local email catch-all for magic links | 54324 |
| Inbucket (SMTP) | Internal SMTP relay for auth emails | 54325 |

**Tools available inside the app:**

- **Charger Reminder** — Track device batteries and get heuristic-based charge reminders.
- **CoreHour** — Time tracking with periodic check-ins and tag-based session history.

---

## Prerequisites

- **Docker Desktop** (or Docker Engine + Compose v2 plugin)
- **4 GB RAM** minimum (8 GB recommended)
- **Bash** (macOS / Linux) or **PowerShell 7+** (Windows)

The setup script checks all prerequisites automatically and tells you what's missing.

---

## Setup

### Step 1: Generate secrets

The `.env.docker` file that ships with this release contains placeholder values. Replace them by running the key generator:

```bash
bash scripts/generate-keys.sh >> .env.docker
```

This appends deterministic secrets to the file. You only need to do this once.

### Step 2: Launch the stack

**On macOS or Linux:**

```bash
bash scripts/setup.sh
```

**On Windows:**

```powershell
pwsh scripts/setup.ps1
```

Both scripts perform the same checks:

- Docker is installed and running
- The `docker compose` plugin is available
- `.env.docker` exists and has no leftover placeholders

If everything passes, the script starts the stack and prints the URLs.

### Step 3: Verify everything is up

Wait about 30 seconds for the first boot, then visit the URLs below.

---

## Accessing the App

### Main application

```
http://localhost:3000
```

The landing page shows the available tools. Click through to start using Charger Reminder or CoreHour.

### Sign-in flow

EfficiencyMemo uses magic-link authentication through Supabase. Here's how it works:

1. Go to the sign-in page and enter your email.
2. The auth service sends a magic-link email.
3. Open the local email dashboard to read it:

   ```
   http://localhost:54324
   ```

4. Click the magic link in the email to complete sign-in.

**Important:** Inbucket at `http://localhost:54324` is the only way to receive magic links in this local Docker setup. No real emails are sent.

### Supabase Studio

```
http://localhost:54323
```

Browse tables, inspect the database schema, and run SQL queries. The Studio connects to the same Postgres instance that the app uses.

### Auth API health check

```
http://localhost:54321/auth/v1/health
```

Returns a JSON health status. Useful for automated monitoring or debugging.

---

## Upgrading

To update to a newer release:

1. Download the new release zip and extract it.
2. Copy your populated `.env.docker` from the old folder into the new one.
3. Pull fresh images and restart:

   ```bash
   docker compose pull
   docker compose up -d
   ```

Your data lives in a named Docker volume (`pgdata`), so it survives container recreations as long as you don't delete the volume.

---

## Troubleshooting

### Port already in use

If you see an error like `bind: address already in use`, another program is listening on one of the required ports. Common fixes:

- **Port 3000** in use: Edit `docker-compose.yml` and change the host mapping from `3000:3000` to something like `3001:3000`. Then visit `http://localhost:3001`.
- **Port 54321** in use: Change `54321:8000` to `54381:8000` (or any other free port — avoid 54322, which is the internal Postgres port and not exposed to the host).
- **Port 54323 / 54324** in use: Adjust the left-hand side of the mapping the same way.

Only edit the number before the colon. The number after the colon is the container's internal port and must stay the same.

### Docker daemon is not running

The setup script will report this explicitly. Start Docker Desktop (or the docker service on Linux) and run the script again.

### `.env.docker` contains unreplaced placeholders

Run the key generator again and append the output:

```bash
bash scripts/generate-keys.sh >> .env.docker
```

Then re-run the setup script.

### Reset all data

To wipe the database and start completely fresh:

```bash
docker compose down -v
docker compose up -d
```

The `-v` flag removes the `pgdata` volume. This is irreversible.

### View logs

Follow logs for all services:

```bash
docker compose logs -f
```

Follow logs for a single service:

```bash
docker compose logs -f nextjs
```

---

## Security Note

The keys generated by `scripts/generate-keys.sh` are deterministic and intended for local use only. They are not cryptographically random enough for production self-hosting.

If you deploy this stack to a public server, regenerate all secrets with a proper random source before starting the containers. Use the same script as a template, but replace the seed generation with `openssl rand -hex 32` run on a secure machine, or use a secrets manager.

Never commit a populated `.env.docker` file to version control.
