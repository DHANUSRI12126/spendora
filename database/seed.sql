-- Seed data for Spendora

USE spendora;

-- Clean existing data (optional but good for seed resets)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE notifications;
TRUNCATE TABLE settlements;
TRUNCATE TABLE expense_splits;
TRUNCATE TABLE group_expenses;
TRUNCATE TABLE group_members;
TRUNCATE TABLE `groups`;
TRUNCATE TABLE budgets;
TRUNCATE TABLE expenses;
TRUNCATE TABLE income;
TRUNCATE TABLE categories;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Seed Users (all passwords are 'password123' using bcrypt hash)
-- Bcrypt hash for 'password123': $2b$12$R9h/lIPzNgbpcG4dy5f83e15.34w4iUqG/nF.9VfRzM9zX9pXg9F2
INSERT INTO users (id, full_name, email, password_hash, role, status) VALUES
(1, 'System Administrator', 'admin@spendora.com', '$2b$12$x7/JQ.A9nPI6jP9q7WyBKeGRdIhLfyStLMAqnGL9whZvCPapB504G', 'ADMIN', 'active'),
(2, 'John Doe', 'john@spendora.com', '$2b$12$x7/JQ.A9nPI6jP9q7WyBKeGRdIhLfyStLMAqnGL9whZvCPapB504G', 'USER', 'active'),
(3, 'Sarah Jenkins', 'sarah@spendora.com', '$2b$12$x7/JQ.A9nPI6jP9q7WyBKeGRdIhLfyStLMAqnGL9whZvCPapB504G', 'USER', 'active'),
(4, 'Mike Ross', 'mike@spendora.com', '$2b$12$x7/JQ.A9nPI6jP9q7WyBKeGRdIhLfyStLMAqnGL9whZvCPapB504G', 'USER', 'active');

-- 2. Seed System Categories
INSERT INTO categories (id, name, type, is_system, user_id, status) VALUES
-- Income categories
(1, 'Salary', 'income', TRUE, NULL, 'active'),
(2, 'Freelance', 'income', TRUE, NULL, 'active'),
(3, 'Business', 'income', TRUE, NULL, 'active'),
(4, 'Scholarship', 'income', TRUE, NULL, 'active'),
(5, 'Gift', 'income', TRUE, NULL, 'active'),
(6, 'Other', 'income', TRUE, NULL, 'active'),
-- Expense categories
(7, 'Food', 'expense', TRUE, NULL, 'active'),
(8, 'Transport', 'expense', TRUE, NULL, 'active'),
(9, 'Shopping', 'expense', TRUE, NULL, 'active'),
(10, 'Bills', 'expense', TRUE, NULL, 'active'),
(11, 'Entertainment', 'expense', TRUE, NULL, 'active'),
(12, 'Healthcare', 'expense', TRUE, NULL, 'active'),
(13, 'Education', 'expense', TRUE, NULL, 'active'),
(14, 'Travel', 'expense', TRUE, NULL, 'active'),
(15, 'Rent', 'expense', TRUE, NULL, 'active'),
(16, 'Other', 'expense', TRUE, NULL, 'active');

-- 3. Seed Custom Categories for Users
INSERT INTO categories (id, name, type, is_system, user_id, status) VALUES
(17, 'Subscriptions', 'expense', FALSE, 2, 'active'), -- John's custom Netflix/Spotify category
(18, 'Gym Membership', 'expense', FALSE, 3, 'active'); -- Sarah's gym category

-- 4. Seed Income
-- Note: inserting dates close to the current system date (August 2026)
INSERT INTO income (user_id, amount, source, date, description, notes) VALUES
(2, 45000.00, 'Salary', '2026-08-01', 'Monthly Tech Job Salary', 'Primary source of income'),
(2, 5000.00, 'Freelance', '2026-08-15', 'Landing Page Design contract', 'Extra side gig income'),
(3, 52000.00, 'Salary', '2026-08-01', 'Corporate Finance Salary', 'Monthly salary'),
(4, 30000.00, 'Salary', '2026-08-02', 'Junior Developer Salary', 'Monthly salary');

-- 5. Seed Expenses
INSERT INTO expenses (user_id, amount, category_id, date, payment_method, description, notes) VALUES
-- John's expenses
(2, 12000.00, 15, '2026-08-01', 'NetBanking', 'Monthly Apartment Rent', 'Landlord transfer'),
(2, 350.00, 7, '2026-08-05', 'UPI', 'Starbucks Coffee', 'Coffee with coworker'),
(2, 1500.00, 7, '2026-08-10', 'Card', 'Grocery Shopping', 'Supermarket visit'),
(2, 2400.00, 10, '2026-08-11', 'UPI', 'Electricity & Wi-Fi Bills', 'Auto-debited utilities'),
(2, 850.00, 8, '2026-08-14', 'UPI', 'Uber ride', 'Trip to client office'),
(2, 5000.00, 9, '2026-08-16', 'Card', 'New Running Shoes', 'Purchased from sports shop'),
(2, 999.00, 17, '2026-08-17', 'Card', 'Netflix Standard Plan', 'Monthly recurring sub'),
-- Sarah's expenses
(3, 15000.00, 15, '2026-08-01', 'NetBanking', 'Apartment Rent Shared', 'Rent split'),
(3, 2200.00, 7, '2026-08-08', 'Card', 'Dinner at Restaurant', 'Weekend outing'),
(3, 3000.00, 18, '2026-08-10', 'Card', 'Gym Subscription Renewal', 'Yearly subscription chunk');

-- 6. Seed Budgets
-- John's budget for August 2026
INSERT INTO budgets (user_id, month, year, amount, categories_budget) VALUES
(2, 8, 2026, 30000.00, '{"7": 6000, "8": 2000, "9": 5000, "10": 4000, "15": 12000, "17": 1000}');

-- 7. Seed Groups
INSERT INTO `groups` (id, name, description, creator_id) VALUES
(1, 'Friends Trip 2026', 'Group for managing trip to Goa in September', 2),
(2, 'Flat 204 Roommates', 'Shared household and utilities splits', 3);

-- 8. Seed Group Members
INSERT INTO group_members (group_id, user_id) VALUES
(1, 2), -- John (Creator)
(1, 3), -- Sarah
(1, 4), -- Mike
(2, 2), -- John
(2, 3); -- Sarah (Creator)

-- 9. Seed Group Expenses & splits
-- Expense 1: John paid 3000 for dinner in group 1, split equally among John, Sarah, Mike (1000 each)
INSERT INTO group_expenses (id, group_id, description, amount, paid_by_id, category_id, date, split_method) VALUES
(1, 1, 'Goa Hotel Booking Deposit', 9000.00, 2, 14, '2026-08-12', 'equal');

INSERT INTO expense_splits (group_expense_id, user_id, amount, percentage) VALUES
(1, 2, 3000.00, 33.33),
(1, 3, 3000.00, 33.33),
(1, 4, 3000.00, 33.33);

-- Expense 2: Sarah paid 2000 for groceries in group 2, split equally (John owes Sarah 1000)
INSERT INTO group_expenses (id, group_id, description, amount, paid_by_id, category_id, date, split_method) VALUES
(2, 2, 'Monthly Grocery Run', 2000.00, 3, 7, '2026-08-14', 'equal');

INSERT INTO expense_splits (group_expense_id, user_id, amount, percentage) VALUES
(2, 2, 1000.00, 50.00),
(2, 3, 1000.00, 50.00);

-- 10. Seed Settlements
-- Pending settlements for Group 1 (Hotel deposit): Sarah owes John 3000, Mike owes John 3000
INSERT INTO settlements (group_id, from_user_id, to_user_id, amount, status, date) VALUES
(1, 3, 2, 3000.00, 'pending', '2026-08-12'),
(1, 4, 2, 3000.00, 'pending', '2026-08-12'),
-- Group 2: John owes Sarah 1000 (pending)
(2, 2, 3, 1000.00, 'pending', '2026-08-14');

-- 11. Seed Notifications
INSERT INTO notifications (user_id, title, message, is_read, type) VALUES
(2, 'Budget Warning', 'You have used 74% of your Monthly Rent budget category.', FALSE, 'budget_warning'),
(3, 'Group Invitation', 'Sarah Jenkins added you to Flat 204 Roommates.', TRUE, 'group_invite');

-- 12. Seed Audit Logs
INSERT INTO audit_logs (user_id, action, description, ip_address) VALUES
(2, 'LOGIN', 'User John Doe logged in successfully', '127.0.0.1'),
(3, 'GROUP_CREATE', 'User Sarah Jenkins created group Flat 204 Roommates', '127.0.0.1');
