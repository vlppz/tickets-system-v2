class Answer < ApplicationRecord
  belongs_to :user
  belongs_to :form

  enum :status, { waiting: "waiting", approved: "approved", edits_required: "edits_required" }
end
