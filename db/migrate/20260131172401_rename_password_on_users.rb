class RenamePasswordOnUsers < ActiveRecord::Migration[8.1]
  def change
    rename_column :users, :passwordHash, :password_digest
  end
end
