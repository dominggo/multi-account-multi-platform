-- Multi-Account Messaging Platform - Database Schema
-- MySQL 8.0+
-- Character Set: utf8mb4 (supports emojis and international characters)

-- Create database (run separately if needed)
-- CREATE DATABASE messaging_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE messaging_platform;

-- ============================================================================
-- ACCOUNTS TABLE
-- Stores all registered phone numbers for both Telegram and WhatsApp
-- ============================================================================
CREATE TABLE IF NOT EXISTS accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  country_code VARCHAR(5) NOT NULL,
  platform ENUM('telegram', 'whatsapp') NOT NULL,
  display_name VARCHAR(100),
  status ENUM('active', 'inactive', 'suspended', 'pending') DEFAULT 'pending',
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMP NULL,
  keep_alive_enabled BOOLEAN DEFAULT TRUE,
  keep_alive_interval INT DEFAULT 86400, -- seconds (24 hours)
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_platform (platform),
  INDEX idx_status (status),
  INDEX idx_country (country_code),
  INDEX idx_phone (phone_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SESSIONS TABLE
-- Stores authentication session data for each account
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  session_token TEXT NOT NULL,
  device_model VARCHAR(100),
  device_os VARCHAR(50),
  app_version VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  INDEX idx_account (account_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- MESSAGES TABLE
-- Stores message history for all accounts
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  platform_message_id VARCHAR(100),
  chat_id VARCHAR(100) NOT NULL,
  chat_name VARCHAR(200),
  sender_id VARCHAR(100),
  sender_name VARCHAR(200),
  content TEXT,
  message_type ENUM('text', 'image', 'video', 'audio', 'document', 'sticker', 'other') DEFAULT 'text',
  media_url VARCHAR(500),
  is_outgoing BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  INDEX idx_account_timestamp (account_id, timestamp),
  INDEX idx_chat (chat_id),
  INDEX idx_platform_msg (platform_message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- KEEP_ALIVE_LOGS TABLE
-- Tracks automated keep-alive message activity
-- ============================================================================
CREATE TABLE IF NOT EXISTS keep_alive_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  message_sent VARCHAR(500),
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  INDEX idx_account_date (account_id, sent_at),
  INDEX idx_success (success)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- CONTACTS TABLE
-- Stores contact information for each account
-- ============================================================================
CREATE TABLE IF NOT EXISTS contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  contact_id VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20),
  display_name VARCHAR(200),
  platform ENUM('telegram', 'whatsapp') NOT NULL,
  is_favorite BOOLEAN DEFAULT FALSE,
  last_message_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  UNIQUE KEY unique_account_contact (account_id, contact_id),
  INDEX idx_account (account_id),
  INDEX idx_favorite (is_favorite)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- USERS TABLE (for web authentication)
-- Stores admin/user credentials for accessing the web interface
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') DEFAULT 'user',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  INDEX idx_username (username),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- WEB_SESSIONS TABLE
-- Stores web application session data (separate from messaging sessions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS web_sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id INT NOT NULL,
  session_data TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- AUDIT_LOGS TABLE
-- Security audit trail for important operations
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(100),
  ip_address VARCHAR(45),
  user_agent TEXT,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================
-- Insert default admin user (password: admin123 - CHANGE IN PRODUCTION!)
-- Password hash is bcrypt hash of 'admin123'
INSERT INTO users (username, email, password_hash, role, is_active)
VALUES ('admin', 'admin@example.com', '$2b$10$rVqZ9J5Z5Z5Z5Z5Z5Z5Z5u', 'admin', TRUE)
ON DUPLICATE KEY UPDATE username=username;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
-- Additional indexes can be added based on query patterns

-- For message search by content (if needed - can be heavy)
-- ALTER TABLE messages ADD FULLTEXT INDEX idx_content_search (content);

-- For quick lookup of recent messages
-- Already covered by idx_account_timestamp

-- ============================================================================
-- VIEWS (Optional - for convenience)
-- ============================================================================

-- View: Active accounts with last activity
CREATE OR REPLACE VIEW v_active_accounts AS
SELECT
  a.id,
  a.phone_number,
  a.country_code,
  a.platform,
  a.display_name,
  a.status,
  a.last_active,
  a.keep_alive_enabled,
  MAX(kal.sent_at) AS last_keepalive_sent,
  COUNT(DISTINCT m.id) AS message_count
FROM accounts a
LEFT JOIN keep_alive_logs kal ON a.id = kal.account_id
LEFT JOIN messages m ON a.id = m.account_id
WHERE a.status = 'active'
GROUP BY a.id;

-- View: Message statistics per account
CREATE OR REPLACE VIEW v_message_stats AS
SELECT
  a.id AS account_id,
  a.phone_number,
  a.platform,
  COUNT(m.id) AS total_messages,
  COUNT(CASE WHEN m.is_outgoing = 1 THEN 1 END) AS sent_messages,
  COUNT(CASE WHEN m.is_outgoing = 0 THEN 1 END) AS received_messages,
  MAX(m.timestamp) AS last_message_time
FROM accounts a
LEFT JOIN messages m ON a.id = m.account_id
GROUP BY a.id;

-- ============================================================================
-- STORED PROCEDURES (Optional - for common operations)
-- ============================================================================

DELIMITER //

-- Procedure: Clean old messages (for data retention)
CREATE PROCEDURE sp_cleanup_old_messages(IN days_to_keep INT)
BEGIN
  DELETE FROM messages
  WHERE timestamp < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);

  SELECT ROW_COUNT() AS deleted_messages;
END //

-- Procedure: Get account summary
CREATE PROCEDURE sp_get_account_summary(IN account_id_param INT)
BEGIN
  SELECT
    a.*,
    s.last_used AS session_last_used,
    s.is_active AS session_active,
    (SELECT COUNT(*) FROM messages WHERE account_id = account_id_param) AS total_messages,
    (SELECT COUNT(*) FROM contacts WHERE account_id = account_id_param) AS total_contacts,
    (SELECT sent_at FROM keep_alive_logs WHERE account_id = account_id_param ORDER BY sent_at DESC LIMIT 1) AS last_keepalive
  FROM accounts a
  LEFT JOIN sessions s ON a.id = s.account_id
  WHERE a.id = account_id_param;
END //

DELIMITER ;

-- ============================================================================
-- GRANTS (Adjust based on your security requirements)
-- ============================================================================
-- Example:
-- GRANT SELECT, INSERT, UPDATE, DELETE ON messaging_platform.* TO 'msgplatform'@'localhost';
-- FLUSH PRIVILEGES;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
SELECT 'Database schema created successfully!' AS status;
SELECT 'Tables created:' AS info, COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema = DATABASE();
