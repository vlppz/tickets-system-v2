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

  def answer
    answer = params[:answer]
    id = params[:form_id]

    if !id or !answer
      render json: { "status": "error", "detail": "Missing one or more required fields" }
      return
    end

    unless answer.respond_to?(:keys) && answer.respond_to?(:values)
      render json: { status: "error", detail: "Answer must be an object" }
      return
    end

    unless answer.keys.all? { |key| key.to_s.start_with?("field_") }
      render json: { status: "error", detail: "Incorrect format" }
      return
    end

    form = Form.find_by(id: id)
    unless form
      render json: { "status": "error", "detail": "No form with that id" }
      return
    end

    if form.closed
      render json: { "status": "error", "detail": "Form is closed" }
      return
    end

    all_answers = Answer.where(user_id: current_user.id)
    all_answers.each do |ans|
      if ans.form_id == id
        render json: { "status": "error", "detail": "You already submitted an answer for this form" }
        return
      end
    end

    content = JSON.parse(form.content)

    answer.each do |field_id, value|
      field = content.find { |field| field["id"] == field_id }

      unless field
        render json: { status: "error", detail: "Incorrect format" }
        return
      end

      case field["type"]

      when "text", "textarea"
        unless value.is_a?(String)
          render json: { status: "error", detail: "Incorrect format" }
          return
        end

      when "number"
        unless value.is_a?(String) && value.match?(/^\d+$/)
          render json: { status: "error", detail: "Incorrect format" }
          return
        end

      when "checkbox"
        unless value.is_a?(TrueClass) or value.is_a?(FalseClass)
          render json: { status: "error", detail: "Incorrect format" }
          return
        end

      when "select"
        unless value.is_a?(String)
          render json: { status: "error", detail: "Incorrect format" }
          return
        end

        if field["options"] && !field["options"].include?(value)
          render json: { status: "error", detail: "Incorrect format" }
          return
        end

      else
        render json: { status: "error", detail: "Incorrect format" }
        return
      end
    end

    content.each do |field|
      field_id = field["id"]
      field_value = answer[field_id]

      is_required = false

      if field["required"]
        is_required = true
      end

      if field["requirementCondition"]
        depends_on_field_id = field["requirementCondition"]["dependsOn"]
        required_value = field["requirementCondition"]["value"]
        actual_value = answer[depends_on_field_id]

        if actual_value == required_value
          is_required = true
        end
      end

      if is_required
        if field_value.nil? || field_value == "" || (field["type"] == "checkbox" && field_value == false)
          render json: { status: "error", detail: "Incorrect format" }
          return
        end
      end
    end

    newanswer = Answer.new(answer: answer, form_id: id, user_id: current_user.id)
    newanswer.save

    render json: { "status": "ok" }
  end
end
