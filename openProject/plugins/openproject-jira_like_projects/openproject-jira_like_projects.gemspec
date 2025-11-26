Gem::Specification.new do |spec|
  spec.name          = "openproject-jira_like_projects"
  spec.version       = "1.0.0"
  spec.authors       = ["OpenProject Community"]
  spec.email         = ["info@openproject.com"]
  spec.summary       = "Jira-style project creation wizard for OpenProject"
  spec.description   = "Adds a Jira-style project creation wizard with templates and team setup"
  spec.homepage      = "https://github.com/opf/openproject-jira_like_projects"
  spec.license       = "GPL-3.0"

  spec.platform      = Gem::Platform::RUBY
  spec.required_ruby_version = ">= 2.7.0"

  spec.files = Dir["{app,config,lib}/**/*"] + 
               ["README.md", "LICENSE", "openproject-jira_like_projects.gemspec"]

  spec.add_dependency "rails", ">= 5.2"
  spec.add_dependency "openproject-core", ">= 11.0"
end
