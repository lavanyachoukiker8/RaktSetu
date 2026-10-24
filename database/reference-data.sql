-- Reference data for RaktSetu

INSERT INTO blood_group (group_code, description) VALUES
  ('A+', 'A Positive'),
  ('A-', 'A Negative'),
  ('B+', 'B Positive'),
  ('B-', 'B Negative'),
  ('AB+', 'AB Positive'),
  ('AB-', 'AB Negative'),
  ('O+', 'O Positive'),
  ('O-', 'O Negative');

INSERT INTO city (name) VALUES
  ('Surat'), ('Ahmedabad'), ('Vadodara'), ('Mumbai'), ('Pune');

INSERT INTO role (name) VALUES
  ('admin'), ('donor'), ('hospital'), ('public');
