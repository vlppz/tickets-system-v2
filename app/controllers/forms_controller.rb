class FormsController < ApplicationController
  skip_before_action :verify_authenticity_token

  before_action :require_login
  before_action :require_admin, only: [:create, :update, :delete]

  def fetch_all
    render json: { "status": "ok", "forms": Form.all }
  end

  def create
    name = params[:name]
    content = params[:content]

    if !name or !content
      render json: { "status": "error", "detail": "Missing one or more required fields" }
      return
    end

    newform = Form.new(name: name, content: content, closed: false)
    newform.save

    render json: { "status": "ok" }
  end

  def update
    id = params[:id]
    name = params[:name]
    content = params[:content]

    if !id or (!name and !content)
      render json: { "status": "error", "detail": "Missing one or more required fields" }
      return
    end

    form = Form.find_by(id: id)
    unless form
      render json: { "status": "error", "detail": "No form with that id" }
      return
    end

    if name
      form.name = name
    end
    if content
      form.content = content
    end

    form.save

    render json: { "status": "ok" }
  end

  def delete
    id = params[:id]

    unless id
      render json: { "status": "error", "detail": "Missing id" }
      return
    end

    form = Form.find_by(id: id)
    unless form
      render json: { "status": "error", "detail": "No form with that id" }
      return
    end

    form.destroy
  end

  def fetch_one
    id = params[:id]

    form = Form.find_by(id: id)
    unless form
      render json: { "status": "error", "detail": "No form with that id" }
      return
    end

    render json: { "status": "ok", "form": form }
  end
end
