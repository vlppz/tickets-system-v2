class TicketStatusMailer < ApplicationMailer
  STATUS_LABELS = {
    "waiting" => "Ожидает проверки",
    "approved" => "Принято",
    "edits_required" => "Нужны правки",
    "declined" => "Отклонено"
  }.freeze

  STATUS_COLORS = {
    "waiting" => { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" },
    "approved" => { bg: "#d1fae5", color: "#065f46", border: "#a7f3d0" },
    "edits_required" => { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
    "declined" => { bg: "#fee2e2", color: "#991b1b", border: "#fecaca" }
  }.freeze

  def status_changed(answer, previous_status, new_status, comment_body = nil)
    @answer = answer
    @user = answer.user
    @form = answer.form
    @form_name = @form.name.presence || "заявка"
    @user_name = user_display_name(@user)
    @new_status_label = status_label(new_status)
    @new_status_colors = status_colors(new_status)
    @comment_body = comment_body.to_s.strip
    @status_changed = previous_status.to_s != new_status.to_s

    mail(
      to: @user.email,
      subject: mail_subject
    )
  end

  private

  def status_label(status)
    STATUS_LABELS.fetch(status.to_s, status.to_s)
  end

  def status_colors(status)
    STATUS_COLORS.fetch(status.to_s, STATUS_COLORS.fetch("waiting"))
  end

  def mail_subject
    if @status_changed
      "Tickets System: статус заявки обновлен - #{@new_status_label}"
    else
      "Tickets System: новый комментарий к заявке"
    end
  end

  def user_display_name(user)
    full_name = [user.surname, user.name, user.second_name].select(&:present?).join(" ")
    full_name.presence || user.email
  end
end
