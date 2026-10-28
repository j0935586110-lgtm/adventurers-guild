"""Static regression guards for low-friction personal sign-up MVP.

These do not replace a real two-account Supabase Auth/RLS end-to-end test.
"""
from pathlib import Path

ROOT = Path(__file__).parents[1]


def test_no_login_wall_on_public_service_market():
    app = (ROOT / "src/App.tsx").read_text()
    assert "useState<'board' | 'my-quests' | 'my-jobs' | 'services'>('services')" in app
    assert "if (!user && showAuth)" in app
    assert "登入／免費加入" in app


def test_personal_listing_does_not_require_business_registration():
    ui = (ROOT / "src/components/MarketplaceMVP.tsx").read_text()
    assert "個人暱稱" in ui
    assert "businessName: displayName" in ui
    assert "商家／工作室名稱" not in ui
    assert "更多設定（選填：分類、價格）" in ui
    assert "免費刊登" in ui


def test_signup_confirmation_is_not_faked():
    provider = (ROOT / "src/components/GuildProvider.tsx").read_text()
    assert "confirmationRequired: !data.session" in provider
    assert "setTimeout" not in provider
    assert "error: error.message" in provider


def test_signup_sql_schema_and_money_permissions():
    sql = (ROOT / "supabase/migrations/20261028000200_personal_member_onboarding.sql").read_text()
    assert "from public.system_config" in sql
    assert "revoke all on public.users from public, anon, authenticated;" in sql
    assert "grant update (display_name, avatar_url, bio, skill_tags)" in sql
    assert "grant update on public.users" not in sql.lower()
    assert "grant insert on public.users" not in sql.lower()
    assert "grant delete on public.users" not in sql.lower()
    assert "grant truncate on public.users" not in sql.lower()


def test_public_alias_does_not_default_to_email_or_oauth_legal_name():
    app = (ROOT / "src/App.tsx").read_text()
    ui = (ROOT / "src/components/MarketplaceMVP.tsx").read_text()
    sql = (ROOT / "supabase/migrations/20261028000200_personal_member_onboarding.sql").read_text()
    assert "guild_nickname" in sql
    assert "split_part(coalesce(new.email" not in sql
    assert "email.split('@')[0]" not in app
    assert "user?.email?.split('@')" not in ui
