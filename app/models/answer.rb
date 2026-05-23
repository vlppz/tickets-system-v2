class Answer < ApplicationRecord
  belongs_to :user
  belongs_to :form

  enum :status, { waiting: "waiting", approved: "approved", edits_required: "edits_required", declined: "declined" }

  validates :status, presence: true, inclusion: { in: statuses.keys }
  validate :comments_must_be_array

  private

  def comments_must_be_array
    return if comments.nil? || comments.is_a?(Array)

    errors.add(:comments, "must be an array")
  end
end
