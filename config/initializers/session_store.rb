secure_session_cookie = if ENV.key?("SESSION_COOKIE_SECURE")
  ActiveModel::Type::Boolean.new.cast(ENV["SESSION_COOKIE_SECURE"])
else
  Rails.env.production?
end

Rails.application.config.session_store :redis_session_store,
                                       key: "_tickets_system_session",
                                       redis: {
                                         url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0"),
                                         expire_after: 1.year,
                                         key_prefix: "session:"
                                       },
                                       secure: secure_session_cookie,
                                       httponly: true,
                                       same_site: :lax
