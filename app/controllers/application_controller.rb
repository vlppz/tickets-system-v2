class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  #allow_browser versions: :modern

  protect_from_forgery with: :exception
  rescue_from ActionController::InvalidAuthenticityToken, with: :invalid_authenticity_token

  helper_method :current_user, :logged_in?

  private

  def invalid_authenticity_token
    render json: { status: "error", detail: "Invalid CSRF token" }, status: :unprocessable_entity
  end

  def current_user
    @current_user ||= User.find_by(id: session[:user_id]) if session[:user_id]
  end

  def logged_in?
    current_user.present?
  end

  def require_login
    unless logged_in?
      render json: { error: "Unauthorized" }, status: :unauthorized
    end
  end

  def require_admin
    unless logged_in? && current_user.is_admin?
      render json: { error: 'Forbidden - Admin access required' }, status: :forbidden
    end
  end
end
