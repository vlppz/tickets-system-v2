class ApplicationMailer < ActionMailer::Base
  default from: ENV.fetch("MAIL_FROM", "notifications@example.com")
  layout "mailer"
end
