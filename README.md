# gator

`gator` is a CLI-based RSS feed aggregator built in TypeScript using Node.js, PostgreSQL, and Drizzle ORM. It allows users to register accounts, subscribe to RSS feeds, and automatically and continuously fetch and store blog posts in the background.

---

## Prerequisites

Before running `gator`, ensure you have the following installed on your system:

- **Node.js** (v18 or higher)
- **npm**, **pnpm**, or **yarn**
- **PostgreSQL** running locally or accessible via a connection URI

---

## Installation & Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/gator.git
   cd gator
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**

   Create a `.env` file in the root directory containing your PostgreSQL connection string:

   ```env
   DB_URL=postgres://postgres:postgres@localhost:5432/gator
   ```

4. **Run database migrations:**

   Generate and apply the migrations using Drizzle Kit:

   ```bash
   npx drizzle-kit generate
   npx drizzle-kit migrate
   ```

5. **Set up the configuration file:**

   `gator` requires a `.gatorconfig.json` file located in your home directory (`~/.gatorconfig.json`). Create this file to set your default user:

   ```json
   {
     "db_url": "postgres://postgres:postgres@localhost:5432/gator",
     "current_user_name": ""
   }
   ```

---

## Usage & Available Commands

Execute commands using `npm run start` followed by the command name and arguments.

### User Management

- **Register a new user:**

  ```bash
  npm run start register <username>
  ```

- **Log in as an existing user:**

  ```bash
  npm run start login <username>
  ```

- **List all registered users:**

  ```bash
  npm run start users
  ```

- **Reset the database (deletes all users and data):**

  ```bash
  npm run start reset
  ```

### Feed Management

- **Add and follow a new feed:**

  ```bash
  npm run start addfeed "TechCrunch" "https://techcrunch.com/feed/"
  ```

- **List all feeds in the database:**

  ```bash
  npm run start feeds
  ```

- **Follow an existing feed by URL:**

  ```bash
  npm run start follow "https://techcrunch.com/feed/"
  ```

- **Unfollow a feed:**

  ```bash
  npm run start unfollow "https://techcrunch.com/feed/"
  ```

- **List feeds the current user is following:**

  ```bash
  npm run start following
  ```

### Aggregator & Content Browsing

- **Start the background aggregator loop:**

  ```bash
  npm run start agg 1m
  ```

  Fetches feeds every 1 minute. Accepts duration strings like `1s`, `30s`, `1m`, and `1h`.

- **Browse saved posts for the current user:**

  ```bash
  npm run start browse 5
  ```

  Optionally pass a limit for the number of posts to view; defaults to 2.