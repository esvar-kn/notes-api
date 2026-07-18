# Notes API

A production-ready RESTful API for managing personal notes, featuring a hybrid database architecture (MongoDB + PostgreSQL), Redis caching, rate limiting, and input sanitization.

## Architecture

This project uses a hybrid database design and caching to maximize performance:
- **User Accounts & Authentication**: Stored in **MongoDB** via Mongoose.
- **Notes Management**: Stored in **PostgreSQL** via **Prisma Client**.
- **Caching**: High-performance cache-aside caching using **Redis** (powered by `ioredis`):
  - Paginated list queries (`GET /api/v1/notes`) are cached with a short TTL (60 seconds) to balance performance and freshness.
  - Note detail queries (`GET /api/v1/notes/:id`) are cached with a 5-minute TTL.
  - Note updates (`PUT`) and deletions (`DELETE`) immediately invalidate the corresponding detail cache key (`note:<id>`) for real-time consistency.
- **Deterministic ID Bridge**: A custom hashing middleware (`ensurePostgresUser`) bridges MongoDB hex ObjectIds to PostgreSQL integer primary keys and automatically ensures user profiles exist in both databases.

## Security & Reliability

- **Rate Limiting**: Integrated `express-rate-limit` to prevent abuse on all `/api/` endpoints (configured to 100 requests per 15 minutes).
- **HTTP Headers Security**: Uses `helmet` to set secure headers.
- **CORS Support**: Configured `cors` with support for credentials and specific origins.
- **Input Sanitization**: Automatically sanitizes title and content inputs via `validator.escape()` inside Zod validator middleware to defend against XSS injection attacks.

## Tech Stack

| Layer          | Technology                    |
|----------------|-------------------------------|
| Runtime        | Node.js v18+                  |
| Framework      | Express 5                     |
| Databases      | MongoDB & PostgreSQL          |
| ORM / Client   | Prisma 6 & Mongoose 9         |
| Cache Database | Redis (`ioredis`)             |
| Auth           | JWT (jsonwebtoken)            |
| Validation     | Zod & Validator.js            |
| Security       | Helmet, CORS, Rate Limit      |
| Logging        | Winston                       |

## Project Structure

```
notes-api/
├── docs/
│   ├── API_SPEC.md         # Full API documentation
│   └── SCHEMA.md           # Relational schema reference
├── generated/
│   └── prisma/             # Generated Prisma client (git-ignored)
├── middlewares/
│   └── auth.js             # JWT protect middleware
├── models/
│   └── user.js             # User Mongoose schema
├── prisma/
│   ├── migrations/         # PostgreSQL DB migrations
│   └── schema.prisma       # Prisma relational schema
├── utils/
│   ├── appError.js         # Operational error class
│   └── logger.js           # Winston logger config
├── .env.example            # Environment variable template
├── .gitignore
├── index.js                # App entry point (routes + middleware)
├── nodemon.json            # nodemon watch config
├── package.json
└── prisma.config.ts        # Prisma configuration
```

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/esvar-kn/notes-api.git
cd notes-api
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your connection strings:
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/notes-api
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRY=7d
SALT_ROUNDS=10
DATABASE_URL="postgresql://postgres:password@localhost:5432/notesdb"
REDIS_URL="redis://localhost:6379"
```

### 3. Initialize PostgreSQL Database

Apply the migrations to set up PostgreSQL schemas:
```bash
npx prisma migrate dev
```

### 4. Build Prisma Client

Generate the plain JavaScript client:
```bash
npx prisma generate
```

### 5. Running the Application

Ensure MongoDB, PostgreSQL, and Redis servers are running locally.

```bash
# Development (nodemon, auto-restart, colored logs)
npm run dev

# Production
npm start
```

### 6. Running with Docker Compose

To run the entire stack (API, PostgreSQL database, and Redis cache) as Docker containers:

1. Create a copy of `.env.docker.example` named `.env.docker`:
   ```bash
   cp .env.docker.example .env.docker
   ```
2. Populate `.env.docker` with your MongoDB connection details, JWT secret, and database passwords.
3. Start the orchestrator:
   ```bash
   docker compose up -d --build
   ```
   *Note: Database migrations (`npx prisma migrate deploy`) will run automatically inside the container when it starts.*

## Environment Variables

The project uses different configuration files depending on your execution environment:
* **`.env`**: Used for running the server locally outside Docker (e.g. `npm run dev`).
* **`.env.docker`**: Used when running the app as a standalone Docker container or via Docker Compose.

---

### 1. Core Server Configuration (Required Everywhere)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | ✅ | — | Port the Express server listens on |
| `MONGO_URI` | ✅ | — | MongoDB connection string (e.g. MongoDB Atlas cluster) |
| `JWT_SECRET` | ✅ | — | Secret key for signing and verifying JWT tokens |
| `JWT_EXPIRY` | ✅ | `7d` | Token expiration duration (e.g., `1h`, `7d`) |
| `SALT_ROUNDS` | ✅ | `10` | Cryptographic complexity factor for bcrypt password hashing |

---

### 2. Local Environment Configuration (Host/Bare-Metal Run)
Place these in your local `.env` file when running the server directly on your host machine:

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql://postgres:devpass@localhost:5432/notesdb` | Connection string to your local PostgreSQL server |
| `REDIS_URL` | ✅ | `redis://localhost:6379` | Connection string to your local Redis server |

---

### 3. Container Network Configuration (Docker Compose Run)
Place these in your `.env.docker` file. These values utilize Docker DNS network paths to connect to database containers on the same network bridge:

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql://postgres:devpass@postgres:5432/notesdb` | Connection string to the `postgres` container service |
| `REDIS_URL` | ✅ | `redis://redis:6379` | Connection string to the `redis` container service |

*(Note: If you are running the API container as a standalone container using `docker run` but connecting to databases hosted natively on your host machine, use `host.docker.internal` instead of `postgres` or `redis` as the host domain).*

---

### 4. Database Setup Config (PostgreSQL Container Initialization)
These configure the root database credentials when the PostgreSQL container initializes via Docker Compose:

| Variable | Required | Default | Description |
|---|---|---|---|
| `POSTGRES_USER` | ❌ | `postgres` | Username for the root PostgreSQL user |
| `POSTGRES_PASSWORD` | ❌ | `devpass` | Password for the root PostgreSQL user |
| `POSTGRES_DB` | ❌ | `notesdb` | Name of the default database created on startup |

