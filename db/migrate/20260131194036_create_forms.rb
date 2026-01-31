class CreateForms < ActiveRecord::Migration[8.1]
  def change
    create_table :forms do |t|
      t.string :name
      t.json :content

      t.boolean :closed

      t.timestamps
    end
  end
end
