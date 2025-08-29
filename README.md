# X-Poll Application

A secure polling application built with Next.js and Supabase.

## Security Features

### Environment Variables

- Environment variables are stored in `.env.local` which is excluded from Git
- Use `.env.example` as a template to set up your own environment variables
- Never commit real credentials to the repository

### Authentication

- Authentication is handled securely through Supabase
- Rate limiting is implemented to prevent brute force attacks
- Password fields use proper security practices

### API Security

- CORS is properly configured to restrict cross-origin requests
- Content Security Policy (CSP) headers are implemented
- HTTP security headers are set to prevent common attacks

### Best Practices

1. **Keep dependencies updated**: Regularly update dependencies to patch security vulnerabilities
   ```bash
   npm audit
   npm update
   ```

2. **Validate user input**: Always validate and sanitize user input on both client and server

3. **Use HTTPS**: Always use HTTPS in production

4. **Implement proper error handling**: Don't expose sensitive information in error messages

5. **Regular security audits**: Periodically review code for security issues

## Database Schema

This application uses Supabase as its database. The schema consists of the following tables:

### Tables

1. **polls** - Stores information about polls
2. **poll_options** - Stores options for each poll
3. **votes** - Stores votes cast by users

Detailed schema information can be found in the [Supabase README](./supabase/README.md).

## Database Functions

The application includes several utility functions for interacting with the database:

- `createPoll` - Create a new poll with options
- `getPoll` - Get a poll with its options
- `getPollWithResults` - Get a poll with voting results
- `getUserPolls` - Get all polls created by the current user
- `getPublicPolls` - Get all public polls
- `castVote` - Cast a vote on a poll
- `hasUserVoted` - Check if a user has already voted on a poll
- `deletePoll` - Delete a poll and its associated data

These functions are available in `lib/supabase/database.ts`.

## API Endpoints

### Polls

- `GET /api/polls` - Get all polls (public or user's polls)
- `POST /api/polls` - Create a new poll
- `GET /api/polls/[id]` - Get a specific poll
- `DELETE /api/polls/[id]` - Delete a poll

### Votes

- `POST /api/polls/[id]/vote` - Cast a vote for a poll option
- `GET /api/polls/[id]/vote` - Check if the user has voted

## Setup Instructions

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in your Supabase credentials
3. Install dependencies: `npm install`
4. Set up the database schema by running the SQL script in `supabase/schema.sql` or using migrations
5. Verify the database schema: `npm run check-db`
6. Run the development server: `npm run dev`

## Deployment

Before deploying to production:

1. Ensure all environment variables are properly set
2. Run security checks: `npm audit`
3. Test the application thoroughly
4. Enable HTTPS

## Security Reporting

If you discover any security issues, please report them responsibly by contacting the maintainers directly instead of opening a public issue.