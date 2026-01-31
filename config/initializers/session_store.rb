Rails.application.config.session_store :redis_session_store,
                                       key: "_tickets_system_session",
                                       redis: {
                                         url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0"),
                                         expire_after: 1.year,
                                         key_prefix: "session:"
                                       },
                                       secure: Rails.env.production?,
                                       httponly: true,
                                       same_site: :lax
