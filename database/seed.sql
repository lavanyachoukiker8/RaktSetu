-- database/seed.sql
-- Development seed data for RaktSetu

-- Locations (cities)
INSERT INTO locations (name, latitude, longitude) VALUES
  ('Mumbai', 19.0760, 72.8777),
  ('Delhi', 28.7041, 77.1025),
  ('Bengaluru', 12.9716, 77.5946);

-- Sample donor (linked to user)
INSERT INTO users (email, password_hash, role) VALUES
  ('donor@example.com', '$2b$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', (SELECT id FROM roles WHERE name='donor'));
INSERT INTO donors (id, name, blood_group, dob, location_id) VALUES
  (LAST_INSERT_ID(), 'Test Donor', 'A+', '1990-01-01', (SELECT id FROM locations WHERE name='Mumbai'));

-- Sample camp
INSERT INTO camps (id, name, location_id, start_date, end_date, capacity) VALUES
  (UUID(), 'Community Blood Camp', (SELECT id FROM locations WHERE name='Delhi'), CURDATE(), DATE_ADD(CURDATE(), INTERVAL 7 DAY), 50);
