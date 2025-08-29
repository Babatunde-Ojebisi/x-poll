# X-Poll Supabase Database Schema

This directory contains the database schema for the X-Poll application using Supabase.

## Schema Overview

The database schema consists of the following tables:

### 1. `polls` Table

Stores information about polls created by users.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| title | TEXT | Poll title |
| description | TEXT | Optional poll description |
| created_at | TIMESTAMP | When the poll was created |
| end_date | TIMESTAMP | When the poll ends (optional) |
| is_public | BOOLEAN | Whether the poll is public |
| allow_multiple_votes | BOOLEAN | Whether users can vote multiple times |
| user_id | UUID | Foreign key to auth.users |

### 2. `poll_options` Table

Stores options for each poll.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| poll_id | UUID | Foreign key to polls |
| option_text | TEXT | Text of the option |
| created_at | TIMESTAMP | When the option was created |

### 3. `votes` Table

Stores votes cast by users or anonymous users.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| poll_id | UUID | Foreign key to polls |
| option_id | UUID | Foreign key to poll_options |
| user_id | UUID | Foreign key to auth.users (for authenticated users) |
| anonymous_user_id | TEXT | ID for anonymous users |
| created_at | TIMESTAMP | When the vote was cast |

## Row Level Security (RLS) Policies

The schema includes RLS policies to ensure data security:

### Polls Table Policies

- Public polls are viewable by everyone
- Users can view, insert, update, and delete their own polls

### Poll Options Table Policies

- Anyone can view options for public polls
- Users can view, insert, update, and delete options for their own polls

### Votes Table Policies

- Anyone can view votes for public polls
- Users can view votes for their own polls
- Users can insert votes for public polls
- Users can update and delete their own votes

## Database Functions

### `check_multiple_votes()`

A trigger function that prevents multiple votes on a poll unless `allow_multiple_votes` is set to true.

### `get_poll_results(poll_id UUID)`

A function that returns the results of a poll, including option text and vote count.

## Views

### `poll_results`

A view that shows poll results, including poll title, option text, and vote count.

## How to Apply the Schema

To apply this schema to your Supabase project:

1. Navigate to the SQL Editor in your Supabase dashboard
2. Copy the contents of `schema.sql`
3. Paste into the SQL Editor and run the query

## TypeScript Integration

The schema is accompanied by TypeScript types in `types/supabase.ts` for type-safe database operations.

## Database Functions

Database utility functions are available in `lib/supabase/database.ts` for interacting with the schema:

- `createPoll`: Create a new poll with options
- `getPoll`: Get a poll with its options
- `getPollWithResults`: Get a poll with voting results
- `getUserPolls`: Get all polls created by the current user
- `getPublicPolls`: Get all public polls
- `castVote`: Cast a vote on a poll
- `hasUserVoted`: Check if a user has already voted on a poll
- `deletePoll`: Delete a poll and its associated data