# Project Rules

## Code Style
- Follow consistent indentation (2 spaces)
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and modular

## Git Workflow
- Create feature branches from main
- Write clear commit messages
- Review code before merging
- Keep commits atomic and focused

## Testing
- Write unit tests for new features
- Maintain test coverage above 80%
- Run tests before committing
- Document test cases

## Documentation
- Update README.md with new features
- Document API changes
- Include setup instructions
- Keep documentation current

## Security
- Never commit sensitive data
- Follow security best practices
- Regular dependency updates
- Code review for security issues

## Performance
- Optimize resource usage
- Monitor performance metrics
- Profile code when needed
- Cache where appropriate

## Collaboration
- Communicate changes clearly
- Review others' code promptly
- Provide constructive feedback
- Keep discussions professional

## Project Structure
- Place all poll-related components in `/app/polls/`
- Keep API routes in `/app/api/` organized by feature
- Store shared types in `/types` directory
- Place reusable components in `/components/shared`

## Form Implementation
- Use react-hook-form for all form handling
- Implement form validation using zod schemas
- Use shadcn/ui components for consistent UI
- Keep form logic separate from presentation

## Supabase Integration
- Use Row Level Security (RLS) for all tables
- Implement proper error handling for Supabase queries
- Use TypeScript types generated from Supabase schema
- Follow prescribed auth flow using Supabase Auth
- Cache frequently accessed data using React Query
