# OpenProject Jira-Like Projects Plugin

A Rails plugin for OpenProject that adds a Jira-style project creation wizard.

## Features

- Multi-step project creation wizard
- Pre-configured project templates
- Template-based team setup
- Workflow configuration
- Comprehensive code review

## Installation

1. Copy this plugin to `plugins/openproject-jira_like_projects`
2. Run `bundle install` in the OpenProject root directory
3. Run `rake db:migrate` to apply any database migrations
4. Restart the Rails server

## Usage

Access the wizard at: `/jira_projects/projects/new`

## Development

This plugin was generated using the OpenProject AI Orchestration System.

### Project Structure

```
app/controllers/     - Controller logic
config/routes.rb     - Plugin routes
lib/                 - Plugin initialization and engine
spec/                - RSpec tests
```

## License

GPL-3.0

## Contributing

Contributions are welcome! Please submit pull requests with tests.
