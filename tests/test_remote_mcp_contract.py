"""M1-M2 static contract; real OAuth sign-in requires the project owner's settings."""
from pathlib import Path
ROOT=Path(__file__).parents[1]

def test_no_privileged_key_or_anonymous_write_tools():
    source=(ROOT/'supabase/functions/guild-mcp/index.ts').read_text()
    assert 'withOAuthProtectedResource()' in source
    assert "withSupabase({auth:'user'})" in source
    assert 'service_role' not in source.lower()
    assert 'apikey' not in source.lower()
    assert 'auth.getUser()' in source
    assert 'guild_inquiries' in source
    assert "status:'completed'" in source

def test_remote_tooling_maps_to_user_flows():
    source=(ROOT/'supabase/functions/guild-mcp/index.ts').read_text()
    for name in ('search_services','get_service','my_profile',
                 'publish_service','my_services','request_quote','my_inquiries',
                 'quote_inquiry','confirm_completion','review_service'):
        assert "registerTool('"+name+"'" in source
    assert 'j1_exec' not in source

def test_oauth_consent_enforces_explicit_approve_or_deny():
    source=(ROOT/'src/components/OAuthConsent.tsx').read_text()
    assert 'getAuthorizationDetails' in source
    assert 'approveAuthorization' in source
    assert 'denyAuthorization' in source
    assert 'authorization_id' in source
    assert "window.location.assign(result.data.redirect_url)" in source

def test_vercel_oauth_route_rewrite_and_auth_policy_template():
    config=(ROOT/'vercel.json').read_text()
    auth=(ROOT/'supabase/config.oauth.example.toml').read_text()
    assert '"/oauth/consent"' in config
    assert 'allow_dynamic_registration = true' in auth
    assert '[functions.guild-mcp-beta]' in auth
    assert 'verify_jwt = false' in auth


def test_public_discovery_has_exactly_three_read_only_tools():
    source=(ROOT/'supabase/functions/guild-discovery/index.ts').read_text()
    assert source.count('server.registerTool(') == 3
    for name in ('search_services','get_service','get_service_reviews'):
        assert "registerTool('"+name+"'" in source
    assert "readOnlyHint:true" in source
    assert '.insert(' not in source and '.update(' not in source and '.delete(' not in source
    assert 'SUPABASE_SERVICE_ROLE_KEY' not in source
