class AddGinIndex < ActiveRecord::Migration[8.1]
  def change
    change_column :answers, :answer, :jsonb, using: 'answer::jsonb'
    add_index :answers, :answer, using: :gin
  end
end
