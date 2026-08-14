CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS portal_auth;

CREATE TABLE IF NOT EXISTS portal_auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL,
    password_hash TEXT NOT NULL,
    roles TEXT[] NOT NULL DEFAULT ARRAY['admin']::TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_portal_auth_users_email_active
    ON portal_auth.users (LOWER(email))
    WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS portal_auth.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES portal_auth.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_portal_auth_sessions_user_id
    ON portal_auth.sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_portal_auth_sessions_token_hash
    ON portal_auth.sessions (token_hash);

CREATE TABLE IF NOT EXISTS portal_auth.session_audits (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES portal_auth.users(id) ON DELETE SET NULL,
    action VARCHAR(80) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    email VARCHAR(160),
    role TEXT,
    token_hash TEXT,
    ip VARCHAR(120),
    user_agent TEXT,
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_auth_session_audits_user_id
    ON portal_auth.session_audits (user_id);

CREATE INDEX IF NOT EXISTS idx_portal_auth_session_audits_created_at
    ON portal_auth.session_audits (created_at DESC);
