require "securerandom"

class FormsController < ApplicationController
  before_action :require_login
  before_action :require_admin, only: [:create, :update, :delete, :get_answers, :get_answer, :update_answer_status]

  MAX_TICKET_COMMENT_LENGTH = 2_000

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

    _answer = Answer.find_by(user_id: current_user.id, form_id: id)

    if _answer
      previous_status = _answer.status
      comments = normalized_comments(_answer.comments)

      _answer.answer = answer
      _answer.comments = comments

      if previous_status != "waiting"
        comments << build_ticket_comment(
          author_role: "user",
          body: "",
          status_from: previous_status,
          status_to: "waiting"
        )
        _answer.status = "waiting"
      end

      unless _answer.save
        render json: { "status": "error", "detail": _answer.errors.full_messages.to_sentence }, status: :unprocessable_entity
        return
      end

      render json: { "status": "ok updated", "answer": serialize_answer(_answer) }
      return
    end

    newanswer = Answer.new(answer: answer, form_id: id, user_id: current_user.id, comments: [])
    unless newanswer.save
      render json: { "status": "error", "detail": newanswer.errors.full_messages.to_sentence }, status: :unprocessable_entity
      return
    end

    render json: { "status": "ok", "answer": serialize_answer(newanswer) }
  end

  def get_my_answer
    id = params[:form_id]

    unless id
      render json: { "status": "error", "detail": "Missing one or more required fields" }
      return
    end

    answer = Answer.find_by(user_id: current_user.id, form_id: id)

    unless answer
      render json: { "status": "error", "detail": "No such answer" }
      return
    end

    render json: serialize_answer(answer)
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

    if params[:status]
      unless Answer.statuses.key?(params[:status])
        render json: { "status": "error", "detail": "Unknown status filter value" }
        return
      end

      base_query = base_query.where(status: params[:status])
    end

    if params[:user_id]
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
    if search
      pattern = "%#{search}%"
      base_query = base_query.joins(:user).where(
        "answers.answer::text ILIKE :pattern OR users.email ILIKE :pattern OR users.name ILIKE :pattern OR users.second_name ILIKE :pattern OR users.surname ILIKE :pattern",
        pattern: pattern
      )
    end

    field_filters = params[:field_filters]
    if field_filters
      unless field_filters.respond_to?(:keys) and field_filters.respond_to?(:values)
        render json: { "status": "error", "detail": "field_filters should be an object" }
        return
      end

      unless field_filters.keys.all? { |key| key.to_s.start_with?("field_") }
        render json: { "status": "error", "detail": "Invalid keys format" }
        return
      end

      filter_hash = field_filters.to_unsafe_h.transform_values do |v|
        case v
        when "true" then true
        when "false" then false
        else v
        end
      end

      base_query = base_query.where("answers.answer::jsonb @> ?", filter_hash.to_json)
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

  def update_answer_status
    answer_id = params[:answer_id] || params[:id]
    new_status = params[:status].to_s
    comment_body = params[:comment].to_s.strip

    if answer_id.blank? || new_status.blank?
      render json: { "status": "error", "detail": "Missing one or more required fields" }, status: :bad_request
      return
    end

    unless Answer.statuses.key?(new_status)
      render json: { "status": "error", "detail": "Unknown status value" }, status: :unprocessable_entity
      return
    end

    if comment_body.length > MAX_TICKET_COMMENT_LENGTH
      render json: { "status": "error", "detail": "Comment is too long" }, status: :unprocessable_entity
      return
    end

    answer = Answer.includes(:user).find_by(id: answer_id)
    unless answer
      render json: { "status": "error", "detail": "No answer with that id" }, status: :not_found
      return
    end

    previous_status = answer.status
    comments = normalized_comments(answer.comments)
    status_changed = previous_status != new_status

    unless status_changed || comment_body.present?
      render json: { "status": "error", "detail": "Nothing to update" }, status: :unprocessable_entity
      return
    end

    comments << build_ticket_comment(
      author_role: "admin",
      body: comment_body,
      status_from: status_changed ? previous_status : nil,
      status_to: status_changed ? new_status : nil
    )

    answer.status = new_status
    answer.comments = comments

    unless answer.save
      render json: { "status": "error", "detail": answer.errors.full_messages.to_sentence }, status: :unprocessable_entity
      return
    end

    notify_ticket_update(answer, previous_status, new_status, comment_body)

    render json: { "status": "ok", "answer": serialize_answer(answer) }
  end

  def reply_to_answer
    answer_id = params[:answer_id] || params[:id]
    comment_body = params[:comment].to_s.strip

    if answer_id.blank? || comment_body.blank?
      render json: { "status": "error", "detail": "Missing one or more required fields" }, status: :bad_request
      return
    end

    if comment_body.length > MAX_TICKET_COMMENT_LENGTH
      render json: { "status": "error", "detail": "Comment is too long" }, status: :unprocessable_entity
      return
    end

    answer = Answer.includes(:user).find_by(id: answer_id)
    unless answer
      render json: { "status": "error", "detail": "No answer with that id" }, status: :not_found
      return
    end

    unless answer.user_id == current_user.id
      render json: { "status": "error", "detail": "Forbidden" }, status: :forbidden
      return
    end

    comments = normalized_comments(answer.comments)
    comments << build_ticket_comment(author_role: "user", body: comment_body)
    answer.comments = comments

    unless answer.save
      render json: { "status": "error", "detail": answer.errors.full_messages.to_sentence }, status: :unprocessable_entity
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
      comments: normalized_comments(answer.comments),
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

  def normalized_comments(comments)
    comments.is_a?(Array) ? comments : []
  end

  def build_ticket_comment(author_role:, body:, status_from: nil, status_to: nil)
    comment = {
      id: SecureRandom.uuid,
      author_id: current_user.id,
      author_role: author_role,
      author_name: comment_author_name(current_user),
      body: body.to_s.strip,
      created_at: Time.current.iso8601
    }

    if status_from.present? && status_to.present? && status_from != status_to
      comment[:status_change] = { from: status_from, to: status_to }
    end

    comment
  end

  def comment_author_name(user)
    return nil if user.is_admin?
    full_name = [user.surname, user.name, user.second_name].select(&:present?).join(" ")
    full_name.presence || user.email || "User ##{user.id}"
  end

  def notify_ticket_update(answer, previous_status, new_status, comment_body)
    return if answer.user.email.blank?

    TicketStatusMailer.status_changed(answer, previous_status, new_status, comment_body).deliver_later
  rescue StandardError => error
    Rails.logger.error("Failed to enqueue ticket update email for answer #{answer.id}: #{error.class}: #{error.message}")
  end
end
