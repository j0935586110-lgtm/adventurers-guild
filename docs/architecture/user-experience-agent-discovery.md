# User Experience & Agent Discovery Architecture

Status: PRODUCT/DISTRIBUTION DIRECTION — 2026-10-01

## 1. One platform, three entrances

Adventurers Guild exposes one matching core through three primary surfaces:

1. **Human Web** — public website for trust, onboarding, task creation, comparison and project tracking.
2. **Agent MCP/API** — model-neutral machine interface for ChatGPT, Gemini, Hermes, Codex and other agents.
3. **Embedded Agent UI** — optional MCP Apps UI rendered inside compatible AI clients such as ChatGPT.

All three surfaces use the same Task, Workflow, Capability, Credential, Actor and Match objects. There must not be separate product logic for each AI vendor.

The public website is not a directory-first product. The first question is not "which profession are you looking for?" It is:

> What are you trying to accomplish?

The system turns the answer into a Workflow and only then exposes the required professionals, agents and tools.
## 2. Human web UX

### Home page
The hero is a single outcome-oriented input:

`I want to...`

Example intents:
- buy an older apartment and move in;
- renovate a bathroom;
- compare mortgage options and prepare the application;
- review a contract;
- find someone to repair an electrical problem.

Below the input, show a few outcome examples rather than hundreds of service categories.

### Result page
After clarification, show the proposed Workflow as an editable task graph. Each node displays:
- what must be done;
- why it is needed;
- required capability;
- required credential, if any;
- whether Agent / Human / Hybrid execution is allowed;
- estimated order/dependencies;
- whether coordination is needed.
### Match page
Do not show a generic provider list. Show eligible Actors per task, with an explainable reason for each match:
- capabilities satisfied;
- credentials verified / missing;
- service area / jurisdiction;
- availability;
- evidence from previous verified work;
- price or price range if available;
- whether the Actor can coordinate downstream tasks.

### Project page
A project is the user's persistent view of the Workflow. It shows:
- task status and dependencies;
- selected Actors;
- pending decisions;
- messages / proposals;
- evidence and deliverables;
- coordination owner;
- next required action.

Users may choose either direct multi-Actor coordination or a Coordinator capability. Removing an intermediary must never mean shifting hidden coordination work back to the user.
## 3. How ChatGPT discovers and uses the Guild

Primary distribution route: publish the Guild as an OpenAI plugin backed by the public HTTPS `/mcp` endpoint. OpenAI's current plugin system uses a universal directory shared by ChatGPT and Codex; once approved and published, the same listing can be discovered from supported surfaces.

Secondary routes:
- direct personal/developer connection to the Guild MCP endpoint;
- public web pages discoverable through normal web search;
- shareable landing/install links from the Guild website.

The ChatGPT integration should expose tools that work without custom UI. Optional MCP Apps UI can render Workflow, Match comparison and confirmation cards directly inside ChatGPT.

Recommended ChatGPT flow:

```text
User: I bought a 25-year-old apartment and want to move in within six weeks.
ChatGPT → Guild MCP: create/preview workflow
Guild → ChatGPT: structured task graph
ChatGPT + embedded UI: user edits/approves tasks
ChatGPT → Guild MCP: find_matches
Guild → ChatGPT: explainable eligible Actors
User approves contact/proposal actions
```

Write actions stay permission-gated; discovery and preview should be usable with minimal friction.
## 4. How Gemini discovers and uses the Guild

Gemini has three distinct integration paths and they should not be conflated:

1. **Gemini CLI** — package the Guild as a Gemini CLI Extension and/or let users add the remote MCP server. This is the clearest current third-party distribution path; Extensions can be installed from a URL and the ecosystem has an Extensions Gallery.
2. **Gemini API** — developers can attach the Guild's Streamable HTTP MCP endpoint as a remote MCP server in the Interactions API.
3. **Consumer Gemini app** — do not assume arbitrary public MCP servers are automatically discoverable there. Use normal web discoverability and, if applicable later, Android app / Connected App distribution or Google partnership paths.

Recommended Gemini CLI flow:

```text
gemini extensions install <Guild extension URL>
        or
gemini mcp add guild https://api.example.com/mcp --transport http

User asks naturally for a task outcome
→ Gemini discovers Guild tools
→ calls workflow/matching tools
→ presents structured results
```

The Guild must remain useful through plain MCP results even when the client does not render custom UI.
## 5. Public discoverability

The Guild needs public pages that both humans and search/AI systems can understand:

- `/` — outcome-first landing page;
- `/how-it-works` — Need → Workflow → Match explanation;
- `/services/<capability>` — capability pages, not only profession pages;
- `/providers/<actor>` — public Actor profiles with evidence and credentials;
- `/workflows/<template>` — reusable outcome templates such as old-home renovation;
- `/for-agents` — MCP/API connection instructions and supported tools;
- `/trust` — verification, credentials, disputes, privacy and responsibility boundaries.

Provider/business pages should use appropriate standard structured data where applicable. For local businesses, use Google-supported LocalBusiness schema with the most specific subtype when the profile really represents that business.

SEO and AI discoverability should target outcome phrases as well as profession terms. Examples:
- `中古屋 買到入住`
- `浴室翻修 要找哪些人`
- `裝潢 水電 冷氣 一起找`
- `房貸 文件 準備`

The website is the trust and acquisition layer; MCP is the action layer.
## 6. How users use the platform

### Human requester
1. Describe the desired outcome in natural language.
2. Answer only the missing high-value clarification questions.
3. Review/edit the generated Workflow.
4. Choose whether to self-coordinate or request a Coordinator.
5. Review eligible Actors per task.
6. Request proposals or contact selected Actors.
7. Track the project from one Workflow page.

### AI-assisted requester
1. User asks ChatGPT/Gemini/Hermes naturally.
2. The assistant invokes Guild discovery tools.
3. The Guild returns the same Workflow and Match objects used by the website.
4. The assistant explains choices; optional embedded UI handles comparison/editing.
5. Any proposal, contract, payment or irreversible action requires the appropriate delegation/confirmation gate.

### Provider / Actor
1. Create a profile.
2. Declare capabilities and service constraints.
3. Add credentials and supporting evidence where required.
4. Choose task types, regions, price ranges and availability.
5. Receive only tasks for which hard eligibility checks pass.
6. Respond directly or allow a delegated Agent to respond within limits.
## 7. MVP UI scope

Do not build a full marketplace dashboard first. The first usable UI needs only five screens:

1. **Outcome input** — one primary text box plus examples.
2. **Workflow review** — editable task graph/list with dependencies.
3. **Match comparison** — eligible Actors with explicit match reasons.
4. **Actor profile** — capability, credential, evidence and availability view.
5. **Project status** — selected Actors, task progress, pending decisions and next action.

Provider onboarding can initially be a structured form rather than a complex dashboard.

## 8. Distribution priority

1. Make the public site understandable and indexable.
2. Deploy one stable HTTPS Streamable HTTP MCP endpoint.
3. Build and test tools without relying on custom UI.
4. Add MCP Apps UI for Workflow/Match comparison in ChatGPT-compatible hosts.
5. Package and submit an OpenAI plugin for the universal ChatGPT/Codex directory.
6. Package a Gemini CLI Extension and prepare an Extensions Gallery submission/distribution path.
7. Publish `/for-agents` with direct MCP and API installation examples.
8. Only after demand validation, invest in deeper mobile/native-app distribution.

Success is not measured by installs alone. Measure: intent submitted → workflow accepted → match viewed → provider contacted/proposal requested → task started.