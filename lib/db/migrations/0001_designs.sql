CREATE TABLE IF NOT EXISTS design_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_member_id INTEGER NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  link TEXT NOT NULL DEFAULT '',
  platform TEXT NOT NULL DEFAULT 'other',
  archived_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS design_assets_owner_idx ON design_assets(team_member_id);

CREATE TABLE IF NOT EXISTS design_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  design_asset_id INTEGER NOT NULL REFERENCES design_assets(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL DEFAULT 'impressions',
  value INTEGER NOT NULL,
  recorded_at INTEGER NOT NULL DEFAULT (unixepoch()),
  manager_id INTEGER NOT NULL REFERENCES users(id),
  note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS design_metrics_asset_idx ON design_metrics(design_asset_id, recorded_at);
