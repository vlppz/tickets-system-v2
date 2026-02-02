Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  # Defines the root path route ("/")
  root "pages#home"
  
  # Pages
  get "forms/builder" => "pages#home"

  # -------------- AUTH --------------
  post "api/auth/register" => "auth#register"
  post "api/auth/login" => "auth#login"
  get "api/auth/logout" => "auth#logout"
  get "api/auth/me" => "auth#me"

  # -------------- FORMS --------------
  post "api/forms/create" => "forms#create"
  get "api/forms/all" => "forms#fetch_all"
  get "api/forms/one" => "forms#fetch_one"
  post "api/forms/update" => "forms#update"
  delete "api/forms/delete" => "forms#delete"
  post "api/forms/answer" => "forms#answer"

  # -------------- APP CONFIG --------------
  get "api/state" => "app_config#state"
  get "api/version" => "app_config#version"
end
