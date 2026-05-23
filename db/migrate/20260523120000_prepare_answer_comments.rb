class PrepareAnswerComments < ActiveRecord::Migration[8.1]
  def change
    change_column_default :answers, :comments, from: nil, to: []
    change_column_null :answers, :comments, false, []
    add_index :answers, :status unless index_exists?(:answers, :status)
  end
end
