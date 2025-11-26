OpenProject::Application.routes.draw do
  namespace :jira_projects do
    resources :projects, only: [:new, :create, :show]
  end
end