class AddAnswers < ActiveRecord::Migration[8.1]
  def change
    create_table :answers do |t|
      t.references :user, null: false, foreign_key: true
      t.references :form, null: false, foreign_key: true

      t.json :answer
      t.string :status, default: "waiting"
      t.json :comments

      t.timestamps
    end
  end
end
