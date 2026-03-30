class TrigramIndexes < ActiveRecord::Migration[8.1]
  def change
    enable_extension "pg_trgm"
    execute <<-SQL
      CREATE INDEX index_answers_trgm ON answers 
      USING gin((answer::text) gin_trgm_ops);

      CREATE INDEX index_users_trgm ON users 
      USING gin((
        coalesce(email,'') || ' ' || 
        coalesce(name,'') || ' ' || 
        coalesce(second_name,'') || ' ' || 
        coalesce(surname,'')
      ) gin_trgm_ops);
    SQL
  end
end
