class RestructureUsersTable < ActiveRecord::Migration[8.1]
  def change
    rename_column :users, :username, :name
    change_table :users do |t|
      t.string :surname
      t.string :second_name
      t.boolean :is_admin
    end
  end
end
