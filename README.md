# Notes API

A RESTful API for managing personal notes, built with **Node.js**, **Express 5**, **MongoDB** (Mongoose), and **JWT** authentication.

## Tech Stack

| Layer          | Technology              |
|----------------|-------------------------|
| Runtime        | Node.js v18+            |
| Framework      | Express 5               |
| Database       | MongoDB + Mongoose 9    |
| Auth           | JWT (jsonwebtoken)      |
| Validation     | Zod                     |
| Password Hash  | bcrypt                  |
| Logging        | Winston                 |
| Dev Server     | nodemon                 |

## Project Structure

```
notes-api/
├── docs/
│   └── API_SPEC.md         # Full API documentation
├── logs/
│   ├── combined.log        # All logs (git-ignored)
│   └── error.log           # Error-only logs (git-ignored)
├── middlewares/
│   └── auth.js             # JWT protect middleware
├── models/
│   ├── note.js             # Note Mongoose schema
│   └── user.js             # User Mongoose schema
├── utils/
│   ├── appError.js         # Operational error class
│   └── logger.js           # Winston logger config
├── .env.example            # Environment variable template
├── .gitignore
├── index.js                # App entry point (routes + middleware)
├── nodemon.json            # nodemon watch config
└── package.json
```

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/esvar-kn/notes-api.git
cd notes-api
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/notes-api
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRY=7d
SALT_ROUNDS=10
```

### 3. Run

```bash
# Development (nodemon, auto-restart, colored request logs)
npm run dev

# Production
npm start
```

## API Overview

Base URL: `/api/v1`

| Method | Endpoint                  | Auth | Description           |
|--------|---------------------------|------|-----------------------|
| POST   | `/users/register`         | ❌   | Register new user     |
| POST   | `/users/login`            | ❌   | Login & get JWT       |
| PUT    | `/users`                  | ✅   | Update own profile    |
| DELETE | `/users`                  | ✅   | Delete own account    |
| POST   | `/notes`                  | ✅   | Create a note         |
| GET    | `/notes`                  | ✅   | Get all notes (paginated) |
| GET    | `/notes/:id`              | ✅   | Get note by ID        |
| PUT    | `/notes/:id`              | ✅   | Update note           |
| DELETE | `/notes/:id`              | ✅   | Delete note           |

See [`docs/API_SPEC.md`](docs/API_SPEC.md) for full request/response documentation.

## Authentication

Protected routes require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

Obtain a token by logging in via `POST /api/v1/users/login`.

## Environment Variables

| Variable     | Required | Default | Description                        |
|--------------|----------|---------|------------------------------------|
| `PORT`       | ✅       | —       | Port the server listens on         |
| `MONGO_URI`  | ✅       | —       | MongoDB connection string          |
| `JWT_SECRET` | ✅       | —       | Secret key for signing JWT tokens  |
| `JWT_EXPIRY` | ✅       | `7d`    | JWT token expiry duration          |
| `SALT_ROUNDS`| ✅       | `10`    | bcrypt salt rounds                 |

## Logging

- **Development**: Colored request logs in terminal + JSON files in `logs/`
- **Production**: JSON file logs only (`logs/combined.log`, `logs/error.log`)

Request log format:
```
2026-07-05 15:31:13 http: POST /api/v1/users/login 200 - 434ms
2026-07-05 15:31:20 warn: GET /api/v1/notes 401 - 2ms
```
