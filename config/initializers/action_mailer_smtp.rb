if ENV["SMTP_ADDRESS"].present? && !Rails.env.test?
  starttls_value = ENV.fetch("SMTP_ENABLE_STARTTLS_AUTO", "true").to_s.downcase
  smtp_settings = {
    address: ENV.fetch("SMTP_ADDRESS"),
    port: ENV.fetch("SMTP_PORT", 587).to_i,
    domain: ENV.fetch("SMTP_DOMAIN", "localhost"),
    enable_starttls_auto: !%w[false 0 no].include?(starttls_value)
  }

  if ENV["SMTP_USERNAME"].present?
    smtp_settings[:user_name] = ENV.fetch("SMTP_USERNAME")
    smtp_settings[:password] = ENV["SMTP_PASSWORD"]
    smtp_settings[:authentication] = ENV.fetch("SMTP_AUTHENTICATION", "plain").to_sym
  end

  Rails.application.configure do
    config.action_mailer.delivery_method = :smtp
    config.action_mailer.raise_delivery_errors = true
    config.action_mailer.smtp_settings = smtp_settings
  end
end
