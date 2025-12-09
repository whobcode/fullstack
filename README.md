# Cloudflare Social RPG Platform

This is a full-stack social platform with a dedicated RPG game section, built entirely on the Cloudflare developer platform. It features a robust backend using Cloudflare Workers, D1, and Durable Objects, and a reactive frontend built with React and Vite.

## Project Overview

This platform is designed as a comprehensive social network where users can manage profiles, interact with friends, and post content. Uniquely, every user account is automatically linked to an RPG character, which they can develop and use in a separate, dedicated game section of the application.

- **Social Platform**: Handles user accounts, profiles, friends, posts, and groups.
- **RPG Game Section**: A distinct area for character management, turn-based battles (asynchronous implemented), and progression.

## Tech Stack

- **Backend**: Hono on Cloudflare Workers
  - **Database**: Cloudflare D1 for all relational data.
  - **Real-time**: Cloudflare Durable Objects (scaffolded for real-time battles).
  - **Background Jobs**: Cloudflare Queues (scaffolded) and Cron Triggers (for offline XP).
  - **Configuration**: Cloudflare KV (scaffolded).
- **Frontend**: React + Vite + React Router
  - SPA architecture with file-based routing.
  - Styled with Tailwind CSS.
- **Deployment**: Cloudflare Workers via Wrangler.

## Getting Started

Follow these instructions to get the project running on your local machine for development and testing.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or later)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd <repository-directory>
```

### 2. Install Dependencies

This project uses `npm` for package management.

```bash
npm install
```

### 3. Set up Local Database

The application uses Cloudflare D1 for its database. You can create a local version for development.

**Create the D1 Database:**
The `wrangler.toml` is configured to use a database named `social_rpg_db`. Create it locally:

```bash
npx wrangler d1 create social_rpg_db --local
```

**Run Migrations:**
Apply the database schema to your local D1 database.

```bash
npx wrangler d1 migrations apply social_rpg_db --local
```

### 4. Run the Development Server

The development server will run both the frontend (Vite) and the backend (Wrangler) concurrently. It supports hot-reloading for a seamless development experience.

```bash
npm run dev
```

The application should now be running at `http://localhost:5173`.

### 5. Seeding the Database

To populate your local database with sample data, the recommended approach is to use the application's UI:

1.  Run the development server (`npm run dev`).
2.  Open your browser to `http://localhost:5173`.
3.  Navigate to the **Register** page.
4.  Create two or more users.

This ensures that all data relationships, password hashes, and initial character records are created correctly by the application logic.

## Project Structure

- `app/`: Contains the React frontend application code.
  - `app/components/`: Shared React components (e.g., `NavBar`).
  - `app/lib/`: Frontend utility functions (e.g., `apiClient`).
  - `app/routes/`: Page components, mapped by file-based routing.
  - `app/root.tsx`: The root layout of the application.
  - `app/routes.ts`: The route configuration file.
- `migrations/`: Contains D1 database schema migrations.
- `workers/`: Contains the Cloudflare Worker backend code.
  - `workers/app.ts`: The main entry point for the Worker, including cron handlers.
  - `workers/src/api/`: Hono API route handlers.
  - `workers/src/core/`: Core application logic (e.g., `battle-engine.ts`, `cron.ts`).
  - `workers/src/lib/`: Backend utility functions.
  - `workers/src/shared/`: Code shared with the frontend (e.g., Zod schemas).
- `wrangler.toml`: The configuration file for Wrangler and Cloudflare resources.

## API Endpoints

The backend API is organized into several modules:

*   **Auth**: Handles user registration, login, logout, and Facebook SSO.
*   **Users**: Manages user profiles and settings.
*   **Friends**: Manages friend requests and relationships.
*   **Game**: Handles game-related actions, including character creation, battles, and stat allocation.
*   **Social**: Manages posts, comments, reactions, and groups.

For more details on the specific endpoints, please refer to the JSDoc comments in the `workers/src/api/` directory.

## Battle System

The battle system is a turn-based, asynchronous system. Here's how it works:

1.  A user challenges another user to a battle.
2.  The battle is created in a "pending" state.
3.  The attacker can then submit a turn.
4.  The `battle-engine.ts` module resolves the turn, calculating damage based on the characters' stats, class modifiers, and a random seed.
5.  The battle state is updated, and the defender's HP is reduced.
6.  If the defender's HP drops to 0 or below, the battle is marked as "completed," and the attacker is declared the winner.
7.  The winner is awarded XP, and the loser receives a loss.

This system can be extended to support real-time battles using the `BattleRoom` Durable Object.

## Contributing

Contributions are welcome! If you'd like to contribute, please follow these steps:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes.
4.  Write tests for your changes.
5.  Run the tests to ensure they pass.
6.  Submit a pull request.

Please make sure to follow the existing code style and to document your changes thoroughly.
