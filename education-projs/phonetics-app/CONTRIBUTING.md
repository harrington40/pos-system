# Contributing to Phonetics App

## Code of Conduct

- Be respectful and inclusive
- Focus on code quality and learning
- Provide constructive feedback

## Getting Started

1. Fork the repository
2. Clone your fork
3. Create a feature branch: `git checkout -b feature/your-feature`
4. Run setup: `bash scripts/setup.sh`
5. Make your changes
6. Test your changes
7. Commit with clear messages
8. Push to your fork
9. Create a Pull Request

## Development Workflow

### Branch Naming

- `feature/feature-name` - New features
- `bugfix/bug-name` - Bug fixes
- `docs/doc-name` - Documentation
- `refactor/refactor-name` - Code refactoring

### Commit Messages

Follow Conventional Commits:

```
feat: add phoneme alignment
fix: resolve audio playback issue
docs: update installation guide
test: add unit tests for lesson service
chore: update dependencies
refactor: simplify viseme scheduler
```

### Code Style

**Backend (Python)**:
```bash
# Format code
black app/

# Check style
flake8 app --max-line-length=120

# Sort imports
isort app/
```

**Frontend (Flutter)**:
```bash
# Format code
flutter format lib/ test/

# Analyze code
flutter analyze
```

## Testing Requirements

All PRs must include:

- **Backend**: Unit tests with >70% coverage
- **Frontend**: Widget tests for new widgets
- **Documentation**: Updated docs if API changes

### Running Tests

```bash
# Backend
cd backend && source venv/bin/activate && pytest tests/ -v

# Frontend
cd frontend && flutter test

# Integration
bash scripts/test.sh
```

## Pull Request Process

1. Update README.md with any new features
2. Ensure all tests pass
3. Update docs if needed
4. Request review from maintainers
5. Address feedback
6. Maintainer merges when approved

## Documentation

- Add docstrings to all functions/classes
- Update README.md for user-facing changes
- Add API documentation for new endpoints
- Include examples where helpful

**Python Docstrings**:
```python
async def get_lesson(user_id: str) -> Lesson:
    """
    Get next lesson for user based on curriculum.
    
    Args:
        user_id: Unique user identifier
        
    Returns:
        Lesson object with phoneme and visemes
        
    Raises:
        HTTPException: If user not found
    """
```

**Dart Documentation**:
```dart
/// Get a lesson from the API.
///
/// Fetches a random or specific lesson from the backend
/// and returns it as a [Lesson] object.
Future<Lesson> getLesson() async { ... }
```

## Reporting Issues

When reporting bugs, include:

1. **Reproduction Steps**: How to reproduce the issue
2. **Expected Behavior**: What should happen
3. **Actual Behavior**: What actually happens
4. **Environment**: OS, Flutter version, Python version, etc.
5. **Logs**: Any relevant error messages
6. **Screenshots**: For UI issues

## Feature Requests

Include:

1. **Problem Statement**: What need does this address?
2. **Proposed Solution**: How should it work?
3. **Alternative Approaches**: Other ways to solve this?
4. **Additional Context**: Examples, references, etc.

## Review Process

- All PRs require at least 1 approval
- CI/CD must pass (tests, linting)
- Code must meet style guidelines
- Documentation must be updated
- Changes must not break existing features

## Release Process

1. Create release branch: `git checkout -b release/v1.2.0`
2. Update version numbers
3. Update CHANGELOG.md
4. Create PR for release
5. Merge to main
6. Tag release: `git tag -a v1.2.0 -m "Release v1.2.0"`
7. Push tags: `git push origin v1.2.0`
8. Create GitHub Release with notes

## Community

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: dev@example.com

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🙏
