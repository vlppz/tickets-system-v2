class AuthController < ApplicationController
  before_action :require_login, only: :logout

  def register
    name = params[:name]
    second_name = params[:second_name]
    surname = params[:surname]
    email = params[:email]
    password = params[:password]

    if !name or !second_name or !surname or !email or !password
      render json: { "status": "error", "detail": "Missing one or more required fields" }
      return
    end

    exists = User.find_by(email: email)
    if exists
      render json: { "status": "error", "detail": "User with this email already exists" }
      return
    end

    newuser = User.new(name: name, second_name: second_name, surname: surname, email: email, password: password, is_admin: false)
    newuser.save

    render json: { "status": "ok" }
  end

  def login
    user = User.find_by(email: params[:email])

    if user&.authenticate(params[:password])
      session[:user_id] = user.id
      render json: { user: current_user.as_json(except: "password_digest"), csrf_token: form_authenticity_token }
    else
      render json: { error: "Invalid credentials" }, status: :unauthorized
    end
  end

  def logout
    session.delete(:user_id)
    reset_session
    render json: { csrf_token: form_authenticity_token }
  end

  def me
    if logged_in?
      render json: { user: current_user.as_json(except: "password_digest") }
    else
      render json: { user: nil }
    end
  end
end
