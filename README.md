# InternLink

InternLink is a full-stack internship management application with a React frontend and a Node.js + Express + MySQL backend.

## Repository structure

- `InternLink-backend/` - backend API server using Express, MySQL, and bcrypt.
- `internlink-frontend/` - React frontend created with Create React App.

## Requirements

- Node.js 18 or newer
- npm
- MySQL 8 or newer

## Setup

1. Install dependencies

```bash
cd InternLink-backend
npm install
cd ../internlink-frontend
npm install
```

2. Configure the database

The backend connects to MySQL using the configuration in `InternLink-backend/db.js`:

- host: `localhost`
- user: `root`
- password: `Dhanush@123`
- database: `InternLink`

If your MySQL credentials are different, update `InternLink-backend/db.js` accordingly.

The backend automatically initializes the `InternLink` database schema on startup if the database exists.

3. Create the database manually if needed

In MySQL:

```sql
CREATE DATABASE IF NOT EXISTS InternLink;
```

4. Start the backend server

```bash
cd InternLink-backend
node server.js
```

The backend listens on port `5000`.

5. Start the frontend

```bash
cd ../internlink-frontend
npm start
```

The React app runs on `http://localhost:3000`.

## Notes

- Backend API endpoints are defined in `InternLink-backend/server.js`.
- The frontend communicates with the backend; make sure the backend is running before using the app.
- If you need to change the backend MySQL credentials, edit `InternLink-backend/db.js`.

## Helpful commands

```bash
# Backend
cd InternLink-backend
npm install
node server.js

# Frontend
cd internlink-frontend
npm install
npm start
```
