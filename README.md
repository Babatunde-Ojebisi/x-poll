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

## Setup Instructions

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in your Supabase credentials
3. Install dependencies: `npm install`
4. Run the development server: `npm run dev`

## Deployment

Before deploying to production:

1. Ensure all environment variables are properly set
2. Run security checks: `npm audit`
3. Test the application thoroughly
4. Enable HTTPS

## Security Reporting

If you discover any security issues, please report them responsibly by contacting the maintainers directly instead of opening a public issue.