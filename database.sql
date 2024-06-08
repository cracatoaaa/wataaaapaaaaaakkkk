CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(100) NOT NULL,
    role ENUM('admin', 'user') NOT NULL
);

CREATE TABLE IF NOT EXISTS urls (
    id INT AUTO_INCREMENT PRIMARY KEY,
    url VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    status ENUM('Checking', 'Safe', 'Blocked', 'Redirected (301)') DEFAULT 'Checking',
    lastChecked DATETIME,
    notified BOOLEAN DEFAULT FALSE
);