class AuthController < ApplicationController
  skip_before_action :verify_authenticity_token

  def register
    username = params[:username]
    email = params[:email]
    password = params[:password]

    newuser = User.new(username: username, email: email, password: password)
    newuser.save

    render :json => {"status": "ok"}
  end
end
