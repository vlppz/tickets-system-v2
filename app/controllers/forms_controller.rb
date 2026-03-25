class FormsController < ApplicationController
  skip_before_action :verify_authenticity_token

  before_action :require_login
  before_action :require_admin, only: [:create, :update, :delete, :get_answers, :get_answer]

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

  def get_answers
    id = params[:form_id]
    limit = params[:limit].to_i
    page = params[:page].to_i

    if id.blank? or limit <= 0 or page <= 0
      render json: { "status": "error", "detail": "Missing one or more required fields" }
      return
    end

    if limit > 100
      render json: { "status": "error", "detail": "Limit is too big or too small" }
      return
    end

    form = Form.find_by(id: id)
    unless form
      render json: { "status": "error", "detail": "No form with that id" }
      return
    end

    base_query = Answer.where(form_id: form.id)

    if params[:status].present?
      unless Answer.statuses.key?(params[:status])
        render json: { "status": "error", "detail": "Unknown status filter value" }
        return
      end

      base_query = base_query.where(status: params[:status])
    end

    if params[:user_id].present?
      user_id = params[:user_id].to_i
      if user_id <= 0
        render json: { "status": "error", "detail": "Invalid user_id filter value" }
        return
      end

      base_query = base_query.where(user_id: user_id)
    end

    date_from = parse_datetime_filter(params[:date_from], :beginning_of_day)
    return if performed?

    date_to = parse_datetime_filter(params[:date_to], :end_of_day)
    return if performed?

    if date_from and date_to and date_from > date_to
      render json: { "status": "error", "detail": "date_from must be earlier than date_to" }
      return
    end

    if date_from
      base_query = base_query.where("answers.created_at >= ?", date_from)
    end

    if date_to
      base_query = base_query.where("answers.created_at <= ?", date_to)
    end

    search = params[:search].to_s.strip
    if search.present?
      pattern = "%#{search}%"
      base_query = base_query.joins(:user).where(
        "answers.answer::text ILIKE :pattern OR users.email ILIKE :pattern OR users.name ILIKE :pattern OR users.second_name ILIKE :pattern OR users.surname ILIKE :pattern",
        pattern: pattern
      )
    end

    total_count = base_query.count
    total_pages = (total_count.to_f / limit).ceil
    total_pages = 1 if total_pages.zero?

    if page > total_pages
      render json: { "status": "error", "detail": "Page is over limit or too small" }
      return
    end

    answers = base_query
                .includes(:user)
                .order(created_at: :desc)
                .limit(limit)
                .offset((page - 1) * limit)

    render json: {
      "answers": answers.map { |answer| serialize_answer(answer) },
      "meta": { "current_page": page, "total_pages": total_pages, "total_count": total_count, "per_page": limit }
    }
  end

  def get_answer
    answer_id = params[:answer_id] || params[:id]

    if answer_id.blank?
      render json: { "status": "error", "detail": "Missing answer id" }
      return
    end

    answer = Answer.includes(:user).find_by(id: answer_id)
    unless answer
      render json: { "status": "error", "detail": "No answer with that id" }
      return
    end

    render json: { "status": "ok", "answer": serialize_answer(answer) }
  end

  private

  def parse_datetime_filter(value, boundary)
    return nil if value.blank?

    parsed_time = Time.zone.parse(value.to_s)
    unless parsed_time
      render json: { "status": "error", "detail": "Invalid date filter value" }
      return nil
    end

    parsed_time.public_send(boundary)
  end

  def serialize_answer(answer)
    {
      id: answer.id,
      form_id: answer.form_id,
      user_id: answer.user_id,
      status: answer.status,
      answer: answer.answer,
      comments: answer.comments,
      created_at: answer.created_at,
      updated_at: answer.updated_at,
      user: {
        id: answer.user.id,
        email: answer.user.email,
        name: answer.user.name,
        second_name: answer.user.second_name,
        surname: answer.user.surname
      }
    }
  end
end
