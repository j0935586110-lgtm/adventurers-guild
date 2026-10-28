# Adventurers Guild — visual design v2
Date: 2026-10-28

## Objective
Replace the dark fantasy-game appearance with an approachable, credible,
modern Taiwan-first people-and-agent services marketplace. Personal users must
understand **search, publish, inquire** within seconds.

## Design system
- Brand: deep jade #174B46 / #1D3B38; accent coral #FF8D76 and warm yellow #F3D88B.
- Surfaces: paper #F8F7F2, white #FFF, listings pale green #F8F9F6.
- Category cards: gentle mint/peach/lavender/sky/yellow/rose; no gradients or fake company photos.
- Typography: Noto Sans TC + DM Sans, with sensible fallbacks. Large bold Chinese headline,
  compact eyebrow labels for structure, body line-height 1.8-2.
- Graphic motif: editorial collage of floating skill chips around an abstract teal seal.
  CSS/vector only, no hotlinked or licensed stock imagery.
- Forms: accessible labels, clear required/optional fields, explicit errors, actual
  Supabase read/write outcomes. No fabricated providers, scores, reviews, or success.
- Mobile: responsive 320/390/720px; single-column cards, accessible mobile menu,
  search and registration usable without horizontal overflow.

## Navigation and preservation
- Main: Explore services, My listings, My inquiries, Legacy quest board, Login, Free listing.
- Legacy Quest/G-Coin application preserved under src/LegacyGuild.tsx, lazy loaded only
  on user intent, to avoid removing original flows.
- Business logic stays in src/lib/marketplace.ts. All database/RLS rules unchanged.
- No real-life person data, company details or financial claims invented for visual design.
- A missing marketplace schema shows an honest friendly "service market preparing" state.
- Individual signup uses existing GuildProvider; no identity documents/corporate registration.

## Applied skill guidance
- Installed Hermes frontend-ui-engineering and build-web-page skills.
- Anthropic official frontend-design skill (visual direction):
  https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design
- Vercel web-interface-guidelines review:
  https://github.com/vercel-labs/web-interface-guidelines
- Installed Vercel react-best-practices and verification skills.
Design deliberately avoids old gold/parchment branding and generic purple SaaS gradients.

## Verification gate before production
- npm run build PASS.
- Browser screenshot / layout at 1440x900, 390x844, 320x740.
- Category interaction, guest->login gate, auth toggle/close, mobile menu.
- Python marketplace/onboarding tests.
- Production unavailable until privacy/RLS migration and two-user end-to-end validation.
- Deploy **preview** only; no main push, no production promotion, no payment or J1 exposure.
