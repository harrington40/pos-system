# frozen_string_literal: true

module JiraProjects
  class ProjectsController < ApplicationController
    before_action :require_login
    before_action :find_project, only: [:show]

    # GET /jira_projects/projects/new
    def new
      @project = Project.new
    end

    # POST /jira_projects/projects
    def create
      @project = Project.new(project_params)
      
      if @project.save
        redirect_to jira_projects_project_path(@project), notice: 'Project created successfully'
      else
        render :new, status: :unprocessable_entity
      end
    end

    # GET /jira_projects/projects/:id
    def show
      @team_members = @project.members.includes(:user, :roles)
    end

    private

    def project_params
      params.require(:project).permit(
        :name,
        :description,
        :identifier,
        :is_public
      )
    end

    def find_project
      @project = Project.find(params[:id])
    rescue ActiveRecord::RecordNotFound
      redirect_to root_path, alert: 'Project not found'
    end
  end
end
