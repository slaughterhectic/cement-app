# CementBook

Complete business management for cement traders.

## Quick Start

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Initialize database with seed data
npm run db:init

# Start both frontend and backend
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## Login

- Username: `admin`
- Password: `cement123`

## Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Charts**: Recharts
- **Tables**: TanStack Table v8
- **Backend**: Express.js
- **Database**: SQLite (better-sqlite3)
- **Excel**: SheetJS (xlsx)

## Project Structure

```
cementbook/
├── client/          # React frontend
│   └── src/
│       ├── pages/       # Route pages
│       ├── components/  # Reusable components
│       └── lib/         # API client, utilities, store
├── server/          # Express backend
│   ├── db/          # Schema, seed, connection
│   └── routes/      # API route handlers
└── data/            # SQLite database file
```
