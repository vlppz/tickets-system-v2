class AppConfigController < ApplicationController
  def version
    render json: { "status": "ok", "version": "dev-0.1" }
  end

  def state
    render json: { "status": "ok", "state": "up" }
  end
end
