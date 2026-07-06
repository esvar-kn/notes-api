# Notes App — Relational Schema (PostgreSQL)

Day 8: designing the Notes App as a relational schema. The same data currently
lives in MongoDB as documents; this is what it looks like when the *database*
(not the application) enforces structure and relationships.

## Entity relationship

```
users 1 ──────< notes
(one user has many notes; each note belongs to exactly one user)
```

In Mongo this relationship only exists by convention (a `userId` field the app
promises to keep valid). In Postgres it's a foreign key — the database refuses
to store a note pointing at a user that doesn't exist.

## Tables

```sql
CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,            -- always a bcrypt/argon2 hash, never plaintext
  created_at  TIMESTAMP DEFAULT now()
);

CREATE TABLE notes (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMP DEFAULT now(),
  updated_at  TIMESTAMP DEFAULT now()
);
```

## Why each piece is there

| Construct | What it does |
|---|---|
| `SERIAL PRIMARY KEY` | Auto-incrementing integer id (1, 2, 3…) backed by a sequence. Postgres's answer to Mongo's `_id`, but small, ordered, and human-readable. |
| `TEXT NOT NULL` | Column must have a value — the DB rejects the row otherwise. In Mongoose this was `required: true`, enforced only by the app; here nothing can bypass it. |
| `UNIQUE` on `email` | The DB builds an index and rejects duplicate emails, even under concurrent requests — no race condition possible, unlike a "check then insert" in app code. |
| `REFERENCES users(id)` | Foreign key: `notes.user_id` must match an existing `users.id`. Inserting a note for a nonexistent user is an error. |
| `ON DELETE CASCADE` | Deleting a user automatically deletes their notes. Without it, deleting a referenced user would be blocked. (Verified live: FK insert with `user_id = 999` failed; deleting user 1 removed their note.) |
| `TIMESTAMP DEFAULT now()` | If the INSERT doesn't supply a value, the DB stamps the current time — like Mongoose's `timestamps: true`. Note: `updated_at` does **not** auto-update on UPDATE; that needs a trigger or the app must set it. |

## Design decisions & open questions

- **`TEXT` vs `VARCHAR(n)`**: in Postgres they perform identically; `VARCHAR(255)`
  is a MySQL habit. Use `TEXT` unless there's a real business limit to enforce.
- **`TIMESTAMP` vs `TIMESTAMPTZ`**: this schema uses plain `TIMESTAMP` (no time
  zone). Production Postgres advice is almost always `TIMESTAMPTZ`, which stores
  an unambiguous instant in UTC. Worth switching when this becomes real.
- **`SERIAL` vs `GENERATED ALWAYS AS IDENTITY`**: `IDENTITY` is the modern SQL
  standard replacement for `SERIAL`; same behavior, cleaner semantics.
- **Missing index**: the query the app runs constantly is "all notes for user X".
  The FK does *not* create an index on `notes.user_id`, so add one:
  `CREATE INDEX idx_notes_user_id ON notes(user_id);`
- **`NOT NULL` on `user_id`?** As written, a note with `user_id = NULL` is
  allowed (an ownerless note). If every note must have an owner, it should be
  `user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE`.

## Mongo → Postgres mental map

| MongoDB (current app) | PostgreSQL |
|---|---|
| Database | Database |
| Collection | Table |
| Document (flexible shape) | Row (fixed columns) |
| `_id: ObjectId` | `id SERIAL PRIMARY KEY` |
| Mongoose schema (app-level) | DDL constraints (DB-level) |
| `ref` + `populate()` | Foreign key + `JOIN` |
| `timestamps: true` | `DEFAULT now()` (+ trigger for updates) |

## Local setup (this machine)

- PostgreSQL 16.14 via Postgres.app, installed at `~/Applications/Postgres.app`
- Data directory: `~/Library/Application Support/Postgres/var-16`
- Server on `localhost:5432`, superuser `postgres` (password `devpass`,
  local auth is `trust` so no password prompt when connecting from this machine)
- Connect: `psql -h localhost -U postgres -d notes`
- Start/stop:
  `pg_ctl -D "$HOME/Library/Application Support/Postgres/var-16" start|stop`
