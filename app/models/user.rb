class User < ApplicationRecord
  include ActiveModel::SecurePassword

  has_secure_password validations: false

  attr_accessor :password_digest
end
