# Session log

One file per work session, named `YYYY-MM-DD.md` (append `-2`, `-3` if more
than one that day). This is what "check the vault instead of the chat
history" means in practice — write the note before ending a session, not
after being asked for it later.

Template:

```markdown
# YYYY-MM-DD

## Did
- What changed and why (link files/PRs, not just prose)

## Decided
- Anything that became an ADR under [[../Decisions/README|Decisions]], or should

## Open questions / follow-ups
- What's unresolved, handed off, or blocked

## Touched
- Areas of the codebase this session cared about
```

Then: link the new file from [[../Home|Home]]'s "Recent sessions" list, and
fold anything durable into [[../Roadmap|Roadmap]] or [[../Glossary|Glossary]]
so the session note itself can eventually be forgotten.
