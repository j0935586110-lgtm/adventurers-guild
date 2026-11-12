# Adventurers Guild / Bring Your Own AI and Google SSO – 2026-11-12

## Design principle
Guild is source of truth for real memberships, tasks and posts; each user brings their own GPT, Gemini CLI, Claude or OpenCode. Pasting a site URL gives context but not authorization. MCP onboarding is a user-confirmed setup, not automatic installation.

## Current MCP capabilities
- /mcp: public read-only remote MCP, 8 verified tools (5 Guild, 3 NodeBB).
- https://wrwsjlydozfzejixofwm.supabase.co/functions/v1/guild-mcp-friend-beta : user OAuth actions.
- https://forum-mcp.928174.xyz/mcp : separate NodeBB MCP with 9 tools including forum_create_topic and forum_reply; only token holders may write, never distribute shared admin token.
- /connect: copy site link, copy safe AI instruction, select ChatGPT / Claude / Gemini CLI / OpenCode config.
- /llms.txt and /AGENTS.md: public human-readable capability declaration, not a standardized automatic MCP installation process.

## Verified client setup references
OpenCode: https://opencode.ai/docs/mcp-servers -- opencode.json mcp.<name>.type=remote and url.
Gemini CLI: https://geminicli.com/docs/tools/mcp-server/ -- ~/.gemini/settings.json mcpServers.<name>.httpUrl for Streamable HTTP.
Claude: https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp -- Customize > Connectors > Add custom connector.
ChatGPT: https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt -- custom apps in supported workspaces with explicit permissions.

## Google shared login: reuse proven OAuth / OIDC
1. Supabase Auth UUID remains the member identity authority. Supabase OIDC discovery confirmed 200 with userinfo and normal scopes.
2. Create or reuse a trusted Google Auth Platform Web OAuth client. Add Supabase callback: https://wrwsjlydozfzejixofwm.supabase.co/auth/v1/callback to Authorized Redirect URIs. Put approved Guild origins and redirect URLs in the relevant dashboard allowlists; prefer stable custom domain, not arbitrary Vercel preview domains.
3. Enable Authentication > Providers > Google in Supabase with server-side client ID/secret, then E2E test signInWithOAuth Google on both mobile and desktop.
4. NodeBB v4.16.0 does not currently have nodebb-plugin-sso-oauth2-multiple installed. The open-source plugin is designed for remote OAuth2 accounts but explicitly primarily tested on Auth0 and Okta. Test compatibility with Supabase OAuth 2.1 PKCE / OIDC in a nonproduction forum before installing in production.
5. Existing NodeBB accounts must be linked only after the member proves control of both accounts and explicitly consents. Do not merge by email/username similarity. Maintain verified Guild UUID <-> NodeBB UID mapping, unique constraints and revoke/relink lifecycle.
6. Validate 2 real accounts: new Google -> Guild -> forum single identity -> member-specific writing via OAuth -> logout/revocation; old accounts, colliding email, mobile cross-device; never use a global forum admin token for ordinary users.

## Still unverified
Supabase Google provider currently external.google=false. No evidence that the Google console client has the required new callback.
NodeBB member-level SSO and forum posts through member-scoped AI authorizations are not complete.
The public MCP is usable, but merely pasting a website URL does not grant write permission or bypass client connector support.
This UI worktree is isolated, not production promotion.
