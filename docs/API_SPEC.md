# Notes API — Specification

> **Base URL:** `/api/v1`
> **Content-Type:** `application/json`
> **Authentication:** JWT Bearer Token (required on protected routes)

---

## Table of Contents

- [Auth Endpoints](#auth-endpoints)
  - [Register](#1-register)
  - [Login](#2-login)
  - [Logout](#3-logout)
  - [Refresh Token](#4-refresh-token)
  - [Get Current User](#5-get-current-user)
  - [Update Profile](#6-update-profile)
- [Notes Endpoints](#notes-endpoints)
  - [Create Note](#1-create-note)
  - [Get All Notes](#2-get-all-notes)
  - [Search Notes](#3-search-notes)
  - [Get Note by ID](#4-get-note-by-id)
  - [Update Note](#5-update-note)
  - [Delete Note](#6-delete-note)
- [Data Schemas](#data-schemas)
- [Error Responses](#error-responses)

---

## Auth Endpoints

### 1. Register

| Field        | Value                   |
|--------------|-------------------------|
| **Method**   | `POST`                  |
| **Endpoint** | `/api/v1/auth/register` |
| **Auth**     | Not required            |
| **Status**   | `201 Created`           |

#### Request Body

| Field      | Type     | Required | Description                             |
|------------|----------|----------|-----------------------------------------|
| `username` | `string` | Yes      | Unique username (3–30 chars)            |
| `email`    | `string` | Yes      | Valid email address                     |
| `password` | `string` | Yes      | Plaintext password (hashed on server, min 8 chars) |

```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

#### Response Body

| Field     | Type     | Description                         |
|-----------|----------|-------------------------------------|
| `message` | `string` | Confirmation message                |
| `token`   | `string` | JWT token for immediate use         |

```json
{
  "message": "User registered successfully",
  "token": "<jwt_token>"
}
```

---

### 2. Login

| Field        | Value                |
|--------------|----------------------|
| **Method**   | `POST`               |
| **Endpoint** | `/api/v1/auth/login` |
| **Auth**     | Not required         |
| **Status**   | `200 OK`             |

#### Request Body

| Field        | Type      | Required | Description                                        |
|--------------|-----------|----------|----------------------------------------------------|
| `username`   | `string`  | Yes      | Registered username                                |
| `password`   | `string`  | Yes      | Account password                                   |
| `rememberMe` | `boolean` | No       | If `true`, issues a long-lived refresh token (default: `false`) |

```json
{
  "username": "john_doe",
  "password": "securePassword123",
  "rememberMe": true
}
```

#### Response Body

| Field           | Type     | Description                                       |
|-----------------|----------|---------------------------------------------------|
| `message`       | `string` | Confirmation message                              |
| `token`         | `string` | Short-lived JWT access token                      |
| `refreshToken`  | `string` | Long-lived refresh token (only if `rememberMe` is `true`) |

```json
{
  "message": "User logged in successfully",
  "token": "<jwt_access_token>",
  "refreshToken": "<jwt_refresh_token>"
}
```

---

### 3. Logout

| Field        | Value                 |
|--------------|-----------------------|
| **Method**   | `POST`                |
| **Endpoint** | `/api/v1/auth/logout` |
| **Auth**     | Required              |
| **Status**   | `200 OK`              |

#### Request Body

| Field          | Type     | Required | Description                                         |
|----------------|----------|----------|-----------------------------------------------------|
| `refreshToken` | `string` | No       | If provided, invalidates the refresh token as well  |

```json
{
  "refreshToken": "<jwt_refresh_token>"
}
```

#### Response Body

| Field     | Type     | Description          |
|-----------|----------|----------------------|
| `message` | `string` | Confirmation message |

```json
{
  "message": "User logged out successfully"
}
```

---

### 4. Refresh Token

| Field        | Value                        |
|--------------|------------------------------|
| **Method**   | `POST`                       |
| **Endpoint** | `/api/v1/auth/refresh-token` |
| **Auth**     | Not required                 |
| **Status**   | `200 OK`                     |

#### Request Body

| Field          | Type     | Required | Description                              |
|----------------|----------|----------|------------------------------------------|
| `refreshToken` | `string` | Yes      | Valid refresh token issued at login      |

```json
{
  "refreshToken": "<jwt_refresh_token>"
}
```

#### Response Body

| Field     | Type     | Description              |
|-----------|----------|--------------------------|
| `token`   | `string` | New short-lived JWT token |

```json
{
  "token": "<new_jwt_access_token>"
}
```

---

### 5. Get Current User

| Field        | Value             |
|--------------|-------------------|
| **Method**   | `GET`             |
| **Endpoint** | `/api/v1/auth/me` |
| **Auth**     | Required          |
| **Status**   | `200 OK`          |

#### Request Body

_None_

#### Response Body

| Field        | Type     | Description                      |
|--------------|----------|----------------------------------|
| `_id`        | `string` | User's unique ID                 |
| `username`   | `string` | Logged-in username               |
| `email`      | `string` | User's email address             |
| `created_at` | `string` | ISO 8601 account creation date   |

```json
{
  "_id": "64a7f2e3c9a4b10012345678",
  "username": "john_doe",
  "email": "john@example.com",
  "created_at": "2026-07-02T10:00:00.000Z"
}
```

---

### 6. Update Profile

| Field        | Value             |
|--------------|-------------------|
| **Method**   | `PATCH`           |
| **Endpoint** | `/api/v1/auth/me` |
| **Auth**     | Required          |
| **Status**   | `200 OK`          |

#### Request Body

> At least one field must be provided.

| Field           | Type     | Required | Description                                       |
|-----------------|----------|----------|---------------------------------------------------|
| `email`         | `string` | No       | New email address                                 |
| `currentPassword` | `string` | No     | Current password (required if changing password)  |
| `newPassword`   | `string` | No       | New password (min 8 chars)                        |

```json
{
  "email": "newemail@example.com",
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

#### Response Body

| Field     | Type     | Description          |
|-----------|----------|----------------------|
| `message` | `string` | Confirmation message |

```json
{
  "message": "Profile updated successfully"
}
```

---

## Notes Endpoints

> All Notes endpoints require a **JWT Bearer Token** in the `Authorization` header.
> ```
> Authorization: Bearer <token>
> ```

---

### 1. Create Note

| Field        | Value           |
|--------------|-----------------|
| **Method**   | `POST`          |
| **Endpoint** | `/api/v1/notes` |
| **Auth**     | Required        |
| **Status**   | `201 Created`   |

#### Request Body

| Field      | Type       | Required | Description                                    |
|------------|------------|----------|------------------------------------------------|
| `title`    | `string`   | Yes      | Title of the note (max 200 chars)              |
| `content`  | `string`   | Yes      | Body content of the note                       |
| `tags`     | `string[]` | No       | Optional list of tags                          |
| `isPinned` | `boolean`  | No       | Pin note to top of list (default: `false`)     |

```json
{
  "title": "My First Note",
  "content": "This is the note content.",
  "tags": ["work", "important"],
  "isPinned": false
}
```

#### Response Body

| Field     | Type     | Description          |
|-----------|----------|----------------------|
| `message` | `string` | Confirmation message |
| `note`    | `object` | The created note     |

```json
{
  "message": "Note created successfully",
  "note": {
    "_id": "64a7f2e3c9a4b10012345abc",
    "title": "My First Note",
    "content": "This is the note content.",
    "tags": ["work", "important"],
    "isPinned": false,
    "created_at": "2026-07-02T15:00:00.000Z",
    "updated_at": "2026-07-02T15:00:00.000Z"
  }
}
```

---

### 2. Get All Notes

| Field        | Value           |
|--------------|-----------------|
| **Method**   | `GET`           |
| **Endpoint** | `/api/v1/notes` |
| **Auth**     | Required        |
| **Status**   | `200 OK`        |

#### Query Parameters

| Param      | Type      | Required | Default      | Description                                                      |
|------------|-----------|----------|--------------|------------------------------------------------------------------|
| `page`     | `integer` | No       | `1`          | Page number for pagination                                       |
| `limit`    | `integer` | No       | `10`         | Number of notes per page (max: `100`)                            |
| `tags`     | `string`  | No       | —            | Comma-separated list of tags to filter by (e.g. `work,urgent`)  |
| `isPinned` | `boolean` | No       | —            | Filter to only pinned (`true`) or unpinned (`false`) notes       |
| `sortBy`   | `string`  | No       | `created_at` | Field to sort by: `created_at`, `updated_at`, or `title`        |
| `order`    | `string`  | No       | `desc`       | Sort direction: `asc` or `desc`                                  |

**Example Request:**
```
GET /api/v1/notes?page=1&limit=10&tags=work,urgent&sortBy=updated_at&order=desc
```

#### Request Body

_None_

#### Response Body

| Field          | Type       | Description                             |
|----------------|------------|-----------------------------------------|
| `data`         | `object[]` | Array of note objects                   |
| `total`        | `integer`  | Total number of notes matching the query |
| `page`         | `integer`  | Current page number                     |
| `limit`        | `integer`  | Notes per page                          |
| `totalPages`   | `integer`  | Total number of pages                   |

```json
{
  "data": [
    {
      "_id": "64a7f2e3c9a4b10012345abc",
      "title": "My First Note",
      "content": "This is the note content.",
      "tags": ["work", "important"],
      "isPinned": false,
      "created_at": "2026-07-02T15:00:00.000Z",
      "updated_at": "2026-07-02T15:00:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

---

### 3. Search Notes

| Field        | Value                  |
|--------------|------------------------|
| **Method**   | `GET`                  |
| **Endpoint** | `/api/v1/notes/search` |
| **Auth**     | Required               |
| **Status**   | `200 OK`               |

#### Query Parameters

| Param   | Type      | Required | Default | Description                                                  |
|---------|-----------|----------|---------|--------------------------------------------------------------|
| `q`     | `string`  | Yes      | —       | Full-text search keyword across `title` and `content`        |
| `tags`  | `string`  | No       | —       | Comma-separated list of tags to additionally filter by       |
| `page`  | `integer` | No       | `1`     | Page number for pagination                                   |
| `limit` | `integer` | No       | `10`    | Number of results per page (max: `100`)                      |

**Example Request:**
```
GET /api/v1/notes/search?q=meeting+notes&tags=work&page=1&limit=5
```

#### Request Body

_None_

#### Response Body

| Field        | Type       | Description                               |
|--------------|------------|-------------------------------------------|
| `data`       | `object[]` | Array of matching note objects            |
| `total`      | `integer`  | Total number of results found             |
| `page`       | `integer`  | Current page number                       |
| `limit`      | `integer`  | Results per page                          |
| `totalPages` | `integer`  | Total number of pages                     |

```json
{
  "data": [
    {
      "_id": "64a7f2e3c9a4b10012345abc",
      "title": "Meeting Notes — Q3",
      "content": "Discussed roadmap and milestones.",
      "tags": ["work"],
      "isPinned": true,
      "created_at": "2026-07-01T09:00:00.000Z",
      "updated_at": "2026-07-01T10:00:00.000Z"
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 5,
  "totalPages": 1
}
```

---

### 4. Get Note by ID

| Field        | Value                |
|--------------|----------------------|
| **Method**   | `GET`                |
| **Endpoint** | `/api/v1/notes/:id`  |
| **Auth**     | Required             |
| **Status**   | `200 OK`             |

#### URL Parameters

| Param | Type     | Required | Description      |
|-------|----------|----------|------------------|
| `id`  | `string` | Yes      | The note's `_id` |

#### Request Body

_None_

#### Response Body

| Field        | Type       | Description                |
|--------------|------------|----------------------------|
| `_id`        | `string`   | Unique note ID             |
| `title`      | `string`   | Title of the note          |
| `content`    | `string`   | Body content of the note   |
| `tags`       | `string[]` | List of tags               |
| `isPinned`   | `boolean`  | Whether the note is pinned |
| `created_at` | `string`   | ISO 8601 creation date     |
| `updated_at` | `string`   | ISO 8601 last updated date |

```json
{
  "_id": "64a7f2e3c9a4b10012345abc",
  "title": "My First Note",
  "content": "This is the note content.",
  "tags": ["work", "important"],
  "isPinned": false,
  "created_at": "2026-07-02T15:00:00.000Z",
  "updated_at": "2026-07-02T15:00:00.000Z"
}
```

---

### 5. Update Note

| Field        | Value                |
|--------------|----------------------|
| **Method**   | `PUT`                |
| **Endpoint** | `/api/v1/notes/:id`  |
| **Auth**     | Required             |
| **Status**   | `200 OK`             |

#### URL Parameters

| Param | Type     | Required | Description      |
|-------|----------|----------|------------------|
| `id`  | `string` | Yes      | The note's `_id` |

#### Request Body

> At least one field must be provided.

| Field      | Type       | Required | Description                                    |
|------------|------------|----------|------------------------------------------------|
| `title`    | `string`   | No       | Updated title                                  |
| `content`  | `string`   | No       | Updated body content                           |
| `tags`     | `string[]` | No       | Updated list of tags (replaces existing tags)  |
| `isPinned` | `boolean`  | No       | Pin or unpin the note                          |

```json
{
  "title": "Updated Title",
  "content": "Updated content goes here.",
  "tags": ["personal"],
  "isPinned": true
}
```

#### Response Body

| Field     | Type     | Description          |
|-----------|----------|----------------------|
| `message` | `string` | Confirmation message |
| `note`    | `object` | The updated note     |

```json
{
  "message": "Note updated successfully",
  "note": {
    "_id": "64a7f2e3c9a4b10012345abc",
    "title": "Updated Title",
    "content": "Updated content goes here.",
    "tags": ["personal"],
    "isPinned": true,
    "created_at": "2026-07-02T15:00:00.000Z",
    "updated_at": "2026-07-02T16:00:00.000Z"
  }
}
```

---

### 6. Delete Note

| Field        | Value                |
|--------------|----------------------|
| **Method**   | `DELETE`             |
| **Endpoint** | `/api/v1/notes/:id`  |
| **Auth**     | Required             |
| **Status**   | `204 No Content`     |

#### URL Parameters

| Param | Type     | Required | Description      |
|-------|----------|----------|------------------|
| `id`  | `string` | Yes      | The note's `_id` |

#### Request Body

_None_

#### Response Body

| Field     | Type     | Description          |
|-----------|----------|----------------------|
| `message` | `string` | Confirmation message |

```json
{
  "message": "Note deleted successfully"
}
```

---

## Data Schemas

### Note

| Field        | Type       | Description                            |
|--------------|------------|----------------------------------------|
| `_id`        | `ObjectId` | Auto-generated unique ID               |
| `title`      | `String`   | Title of the note (max 200 chars)      |
| `content`    | `String`   | Body content of the note               |
| `tags`       | `[String]` | Array of tag strings                   |
| `isPinned`   | `Boolean`  | Whether the note is pinned (default: `false`) |
| `created_at` | `Date`     | Timestamp when note was created        |
| `updated_at` | `Date`     | Timestamp when note was last updated   |

### User

| Field        | Type       | Description                              |
|--------------|------------|------------------------------------------|
| `_id`        | `ObjectId` | Auto-generated unique ID                 |
| `username`   | `String`   | Unique username (3–30 chars)             |
| `email`      | `String`   | Unique email address                     |
| `password`   | `String`   | Hashed password (never returned via API) |
| `created_at` | `Date`     | Timestamp when user was created          |
| `updated_at` | `Date`     | Timestamp when user was last updated     |

---

## Error Responses

All errors follow a consistent shape:

| Field     | Type      | Description                       |
|-----------|-----------|-----------------------------------|
| `success` | `boolean` | Always `false` on error           |
| `message` | `string`  | Human-readable error description  |

### Common HTTP Status Codes

| Status | Meaning                                          |
|--------|--------------------------------------------------|
| `400`  | Bad Request — missing or invalid fields          |
| `401`  | Unauthorized — missing or invalid JWT token      |
| `403`  | Forbidden — access to resource not allowed       |
| `404`  | Not Found — resource does not exist              |
| `422`  | Unprocessable Entity — validation errors         |
| `429`  | Too Many Requests — rate limit exceeded          |
| `500`  | Internal Server Error — unexpected server error  |

```json
{
  "success": false,
  "message": "Unauthorized: token is missing or invalid"
}
```
