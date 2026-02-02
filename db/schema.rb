# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_02_02_121501) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "answers", force: :cascade do |t|
    t.json "answer"
    t.json "comments"
    t.datetime "created_at", null: false
    t.bigint "form_id", null: false
    t.string "status", default: "waiting"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["form_id"], name: "index_answers_on_form_id"
    t.index ["user_id"], name: "index_answers_on_user_id"
  end

  create_table "forms", force: :cascade do |t|
    t.boolean "closed"
    t.json "content"
    t.datetime "created_at", null: false
    t.string "name"
    t.datetime "updated_at", null: false
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email"
    t.boolean "is_admin"
    t.string "name"
    t.string "password_digest"
    t.string "second_name"
    t.string "surname"
    t.datetime "updated_at", null: false
  end

  add_foreign_key "answers", "forms"
  add_foreign_key "answers", "users"
end
