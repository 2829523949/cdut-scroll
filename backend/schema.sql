CREATE TABLE IF NOT EXISTS responses (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version TEXT NOT NULL,
  answers TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  dimensions TEXT NOT NULL,
  edit_hash TEXT NOT NULL,
  privacy_version TEXT NOT NULL
  ,revision INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS responses_created ON responses(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS responses_code ON responses(code);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires INTEGER NOT NULL
);
