-- Public page view analytics (anonymous + authenticated visitors)

CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  page_title TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  viewer_type TEXT NOT NULL DEFAULT 'guest',
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views (path);
CREATE INDEX IF NOT EXISTS idx_page_views_session_created ON page_views (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON page_views (user_id) WHERE user_id IS NOT NULL;

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE page_views IS 'Anonymous and authenticated public page views — written via service role API only';
