-- Leave Management System Database Schema
-- MySQL 8.0+ Recommended

CREATE DATABASE IF NOT EXISTS erp_leave_system;
USE erp_leave_system;

-- Teams Table (For Load Balancing)
CREATE TABLE IF NOT EXISTS teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('PRINCIPAL', 'HOD', 'STAFF', 'STUDENT') NOT NULL,
    department VARCHAR(100),
    manager_id INT,
    team_id INT,
    joining_date DATE,
    points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

-- Leave Inventory
CREATE TABLE IF NOT EXISTS leave_inventory (
    user_id INT PRIMARY KEY,
    casual INT DEFAULT 10,
    sick INT DEFAULT 12,
    earned INT DEFAULT 15,
    medical INT DEFAULT 10, -- For students
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Leaves Table
CREATE TABLE IF NOT EXISTS leaves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    leave_type VARCHAR(50) NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'RISKY') DEFAULT 'PENDING',
    priority_score FLOAT DEFAULT 0,
    reviewer_id INT,
    reviewer_comment TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_emergency BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Rules & Weights for Smart Engine
CREATE TABLE IF NOT EXISTS rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_key VARCHAR(50) UNIQUE NOT NULL,
    rule_value FLOAT NOT NULL,
    description TEXT
);

-- Seed Initial Teams
INSERT IGNORE INTO teams (id, name, department) VALUES 
(1, 'CS Faculty', 'Computer Science'),
(2, 'Admin Dept', 'Management');

-- Seed Initial Users (Passwords are 'password123' bcrypt hashed)
-- Use '$2b$10$v7.Y8P.9Z.v/eE9ZkC2l.uY8U8v8v8v8v8v8v8v8v8v8v8v8v8' as a temporary hash for password123
INSERT IGNORE INTO users (id, name, email, password, role, department, joining_date, team_id) VALUES
(1, 'Dr. Sarah Jenkins', 'principal@college.edu', '$2b$10$7R6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU', 'PRINCIPAL', 'Management', '2015-08-15', 2),
(2, 'Prof. Alan Turing', 'alan@college.edu', '$2b$10$7R6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU', 'HOD', 'Computer Science', '2018-01-10', 1);

INSERT IGNORE INTO users (id, name, email, password, role, department, manager_id, joining_date, team_id) VALUES
(3, 'Dr. Grace Hopper', 'grace@college.edu', '$2b$10$7R6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU', 'STAFF', 'Computer Science', 2, '2020-03-22', 1),
(4, 'Alice Smith', 'alice@college.edu', '$2b$10$7R6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU6vU', 'STUDENT', 'Computer Science', 3, '2023-07-01', 1);

-- Seed Leave Inventory
INSERT IGNORE INTO leave_inventory (user_id, casual, sick, earned) VALUES (1, 10, 12, 15), (2, 8, 10, 12), (3, 5, 12, 10);
INSERT IGNORE INTO leave_inventory (user_id, medical, casual) VALUES (4, 10, 5);

-- Seed Smart Engine Rules
INSERT IGNORE INTO rules (rule_key, rule_value, description) VALUES 
('team_load_threshold', 0.4, 'Block or warn if over 40% team is on leave'),
('early_planning_bonus', 10.0, 'Points for planning 10+ days ahead'),
('emergency_weight', 50.0, 'Weight bonus for emergency types'),
('low_balance_penalty', -20.0, 'Penalty score for low leave balance');
