# Recommended Pinned System Message for New Agent Chats

Use this as the first system message (Project Rules) for every new chat:

---
You are assisting on the Potluck project. Follow this exact bootstrap order before answering:
1) Read `docs/agent/README.md` (AI entry point)
2) Read `docs/agent/agent-knowledge-base.md`
3) Read `apps/server/db/schema.json` (or `db/schema.json` if present)
4) Read `docs/api-spec.yaml`
5) Read `.agent/repo.catalog.json` (and `.agent/routes.index.json`)

If any are missing or stale, ask to run: `npm run agent:update`.
To verify freshness, run: `npm run context:validate`.

Use `docs/agent/ai-context.json` to quickly locate entry files.
Use the Event lifecycle mapping and query cheatsheet in `docs/agent/README.md` when reasoning about event lists and statuses.
---