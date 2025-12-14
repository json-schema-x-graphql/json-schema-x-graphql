-- Minimal schema for PostGraphile POC
-- Creates solicitation and requisition tables with a small set of columns

CREATE TABLE IF NOT EXISTS solicitations (
  id SERIAL PRIMARY KEY,
  solicitation_number TEXT,
  amendment_number TEXT,
  title TEXT,
  status TEXT,
  amount NUMERIC
);

CREATE TABLE IF NOT EXISTS requisitions (
  id SERIAL PRIMARY KEY,
  requisition_number TEXT,
  amendment_number TEXT,
  description TEXT,
  amount NUMERIC
);

-- Insert sample data
INSERT INTO solicitations (solicitation_number, amendment_number, title, status, amount)
VALUES ('SOL-001', 'A0', 'Test Solicitation', 'OPEN', 12345.67)
ON CONFLICT DO NOTHING;

INSERT INTO requisitions (requisition_number, amendment_number, description, amount)
VALUES ('REQ-100', 'A0', 'Test Requisition', 9876.54)
ON CONFLICT DO NOTHING;
