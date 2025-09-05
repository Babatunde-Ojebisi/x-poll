# X-Poll Application

A modern, secure polling application that allows users to create polls, vote on them, and view real-time results. Built with enterprise-grade security features including CSRF protection, rate limiting, and comprehensive authentication.

## 🚀 Project Overview

X-Poll is a full-stack web application designed for creating and managing polls with advanced security features. Users can create polls with multiple options, set expiration dates, and view voting results in real-time. The application emphasizes security, performance, and user experience.

### Key Features

- **Secure Authentication**: Supabase-powered authentication with session management
- **Real-time Polling**: Create polls with multiple options and expiration dates
- **Vote Management**: Cast votes with duplicate prevention and result tracking
- **Security First**: CSRF protection, rate limiting, and input validation
- **Responsive Design**: Modern UI that works across all devices
- **Admin Controls**: Poll creators can manage and delete their polls

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **React Hooks** - State management and side effects

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Supabase** - Backend-as-a-Service (Database, Auth, Real-time)
- **PostgreSQL** - Relational database with Row Level Security

### Security & Middleware
- **CSRF Protection** - Cross-Site Request Forgery prevention
- **Rate Limiting** - API abuse prevention
- **Input Validation** - Comprehensive data sanitization
- **Session Management** - Secure user session handling

### Development Tools
- **ESLint** - Code linting and formatting
- **TypeScript** - Static type checking
- **Git** - Version control

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

## 📋 Setup Instructions

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account (free tier available)
- Git for version control

### 1. Clone the Repository

```bash
git clone <repository-url>
cd x-poll
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Supabase Configuration

#### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be fully initialized
3. Navigate to Settings > API to get your credentials

#### Set Up Database Schema

1. Go to the SQL Editor in your Supabase dashboard
2. Run the SQL script from `supabase/schema.sql` to create tables and functions
3. Enable Row Level Security (RLS) on all tables

### 4. Environment Variables

Copy the example environment file and configure your variables:

```bash
cp .env.example .env.local
```

Update `.env.local` with your Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key

# Security (Optional - for enhanced security)
CSRF_SECRET=your_csrf_secret
RATE_LIMIT_SECRET=your_rate_limit_secret
```

#### Getting Supabase Keys

- **Project URL**: Found in Settings > API > Project URL
- **Anon Key**: Found in Settings > API > Project API keys > anon public
- **Service Role Key**: Found in Settings > API > Project API keys > service_role (keep this secret!)

### 5. Database Verification

Verify your database setup:

```bash
npm run check-db
```

### 6. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 📖 Usage Examples

### Creating a Poll

1. **Sign Up/Login**
   - Navigate to the application
   - Click "Sign Up" or "Login" 
   - Use email/password authentication via Supabase

2. **Create a New Poll**
   ```typescript
   // Example poll data structure
   {
     title: "What's your favorite programming language?",
     description: "Choose your preferred language for web development",
     options: [
       "JavaScript",
       "TypeScript", 
       "Python",
       "Go"
     ],
     expiresAt: "2024-12-31T23:59:59Z", // Optional expiration
     isPublic: true // Make poll visible to all users
   }
   ```

3. **Poll Creation Flow**
   - Click "Create Poll" button
   - Fill in poll title and description
   - Add 2-10 poll options
   - Set expiration date (optional)
   - Choose visibility (public/private)
   - Submit to create the poll

### Voting on Polls

1. **Browse Available Polls**
   - View public polls on the homepage
   - Search polls by title or description
   - Filter by active/expired polls

2. **Cast Your Vote**
   ```typescript
   // Voting process
   {
     pollId: "uuid-of-poll",
     optionId: "uuid-of-selected-option",
     userId: "authenticated-user-id" // Handled automatically
   }
   ```

3. **Voting Flow**
   - Click on any poll to view details
   - Select your preferred option
   - Click "Vote" button
   - View real-time results immediately
   - Note: One vote per user per poll

### Managing Your Polls

1. **View Your Polls**
   - Navigate to "My Polls" section
   - See all polls you've created
   - View vote counts and results

2. **Poll Management**
   - Edit poll details (before votes are cast)
   - Delete polls you own
   - View detailed voting analytics
   - Export poll results

## 🧪 Local Development & Testing

### Development Workflow

```bash
# Start development server with hot reload
npm run dev

# Run in different modes
npm run dev -- --port 3001  # Custom port
npm run dev -- --turbo      # Enable Turbo mode
```

### Code Quality & Linting

```bash
# Run ESLint for code quality
npm run lint

# Fix auto-fixable linting issues
npm run lint:fix

# Type checking with TypeScript
npm run type-check
```

### Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run end-to-end tests
npm run test:e2e
```

### Database Testing

```bash
# Verify database connection
npm run check-db

# Test database functions
npm run test:db

# Reset database (development only)
npm run db:reset
```

### Building for Production

```bash
# Create production build
npm run build

# Test production build locally
npm run start

# Analyze bundle size
npm run analyze
```

### Environment-Specific Testing

```bash
# Test with different environments
NODE_ENV=test npm run dev        # Test environment
NODE_ENV=production npm run build # Production build
```

### Debugging

1. **Client-Side Debugging**
   - Use browser DevTools
   - React DevTools extension
   - Network tab for API calls

2. **Server-Side Debugging**
   - Check terminal logs
   - Use `console.log` in API routes
   - Monitor Supabase dashboard

3. **Database Debugging**
   - Use Supabase SQL Editor
   - Check RLS policies
   - Monitor real-time subscriptions

### Common Development Issues

1. **Environment Variables**
   ```bash
   # Verify environment variables are loaded
   npm run env:check
   ```

2. **Database Connection**
   ```bash
   # Test Supabase connection
   npm run supabase:test
   ```

3. **Port Conflicts**
   ```bash
   # Use different port if 3000 is occupied
   npm run dev -- --port 3001
   ```

## 🚀 Deployment

### Production Deployment

Before deploying to production:

1. **Environment Setup**
   ```bash
   # Build and test locally first
   npm run build
   npm run start
   ```

2. **Security Checklist**
   ```bash
   # Run security audit
   npm audit
   npm audit fix
   
   # Check for vulnerabilities
   npm run security:check
   ```

3. **Production Environment Variables**
   - Set all required environment variables
   - Use production Supabase project
   - Enable HTTPS
   - Configure proper CORS settings

4. **Deployment Platforms**
   - **Vercel** (Recommended): `vercel --prod`
   - **Netlify**: Connect GitHub repository
   - **Railway**: Deploy with railway CLI
   - **Docker**: Use provided Dockerfile

### Post-Deployment

- Monitor application performance
- Set up error tracking (Sentry recommended)
- Configure analytics
- Test all functionality in production

## 📁 Project Structure

```
x-poll/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── polls/         # Poll-related endpoints
│   │   └── auth/          # Authentication endpoints
│   ├── components/        # React components
│   │   ├── ui/           # Reusable UI components
│   │   └── forms/        # Form components
│   ├── polls/            # Poll pages
│   └── globals.css       # Global styles
├── lib/                   # Utility libraries
│   ├── supabase/         # Supabase client & functions
│   ├── utils/            # Helper utilities
│   └── hooks/            # Custom React hooks
├── middleware.ts          # Next.js middleware
├── types/                 # TypeScript type definitions
├── supabase/             # Database schema & migrations
└── public/               # Static assets
```

## 🤝 Contributing

1. **Fork the Repository**
   ```bash
   git fork <repository-url>
   git clone <your-fork-url>
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Development Guidelines**
   - Follow existing code style
   - Add tests for new features
   - Update documentation
   - Run linting before commits

4. **Submit Pull Request**
   - Provide clear description
   - Include screenshots for UI changes
   - Ensure all tests pass

## 🔧 Troubleshooting

### Common Issues

1. **"Supabase client not initialized"**
   ```bash
   # Check environment variables
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

2. **Database connection errors**
   - Verify Supabase project is active
   - Check RLS policies are enabled
   - Ensure service role key is correct

3. **Build failures**
   ```bash
   # Clear Next.js cache
   rm -rf .next
   npm run build
   ```

4. **Authentication issues**
   - Check Supabase Auth settings
   - Verify redirect URLs
   - Ensure email templates are configured

### Getting Help

- Check existing GitHub issues
- Review Supabase documentation
- Join the community Discord
- Create detailed bug reports

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🔒 Security Reporting

If you discover any security issues, please report them responsibly by contacting the maintainers directly instead of opening a public issue.

---

**Built with ❤️ using Next.js and Supabase**