# Gepperdy API Documentation

## Overview

This Next.js application includes a RESTful API backend with full CRUD operations for user management.

## Base URL

```
http://localhost:3000/api
```

## Endpoints

### Hello Endpoint

#### GET /api/hello
Simple test endpoint to verify API is running.

**Response:**
```json
{
  "message": "Hello from the API!",
  "timestamp": "2025-12-29T10:00:00.000Z"
}
```

#### POST /api/hello
Echo endpoint that returns received data.

**Request Body:**
```json
{
  "any": "data"
}
```

**Response:**
```json
{
  "message": "Data received",
  "receivedData": { "any": "data" },
  "timestamp": "2025-12-29T10:00:00.000Z"
}
```

---

### Users Endpoints

#### GET /api/users
Fetch all users.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Alice Johnson",
      "email": "alice@example.com"
    },
    {
      "id": 2,
      "name": "Bob Smith",
      "email": "bob@example.com"
    }
  ]
}
```

#### POST /api/users
Create a new user.

**Request Body:**
```json
{
  "name": "Charlie Brown",
  "email": "charlie@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "Charlie Brown",
    "email": "charlie@example.com"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Name and email are required"
}
```

#### GET /api/users/[id]
Get a specific user by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Alice Johnson",
    "email": "alice@example.com"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "User not found"
}
```

#### PUT /api/users/[id]
Update a user by ID.

**Request Body:**
```json
{
  "name": "Alice Williams",
  "email": "alice.w@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Alice Williams",
    "email": "alice.w@example.com"
  }
}
```

#### DELETE /api/users/[id]
Delete a user by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Alice Johnson",
    "email": "alice@example.com"
  },
  "message": "User deleted successfully"
}
```

#### DELETE /api/users
Delete all users (for testing purposes).

**Response:**
```json
{
  "success": true,
  "message": "All users deleted"
}
```

---

## Client-Side API Utilities

The application includes a client-side API utility library located at `lib/api.ts` that provides convenient wrapper functions for all endpoints.

### Usage Example

```typescript
import { userApi } from '@/lib/api';

// Get all users
const response = await userApi.getAll();
if (response.success) {
  console.log(response.data);
}

// Create a user
const newUserResponse = await userApi.create({
  name: 'John Doe',
  email: 'john@example.com'
});

// Update a user
const updateResponse = await userApi.update(1, {
  name: 'Jane Doe'
});

// Delete a user
const deleteResponse = await userApi.delete(1);
```

---

## Error Handling

All API responses follow a consistent structure:

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Notes

- Currently using in-memory storage. Replace with a database (PostgreSQL, MongoDB, etc.) for production use.
- CORS headers are configured in `middleware.ts` to allow cross-origin requests.
- All endpoints return JSON responses.
- Timestamps are in ISO 8601 format.

