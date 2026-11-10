---
kind: decision
status: decided
decision: move-purge
by: Benedikt
priority: 1
order: 24
area: marketing
owner: Benedikt
evidence: "Read whole on 09.11.: docs/agent-work/2026-11-08-portrait-sources.md, docs/agent-work/2026-11-08-portraits-ai.md and docs/agent-work/items/ask-clients-for-portrait-originals.md. gh api reports the repository as public."
recommended: move
options:
  - key: move
    label: Move the three files to Company OS and leave one measurement-only report here
    detail: "The reports and the open question leave this repository. A new report here keeps the method and the numbers without names. Git history keeps the old text, so anyone who digs through the commits can still read it."
  - key: move-purge
    label: Move them and rewrite the Git history
    detail: "Also removes the old text from the commits. Every tag from v1.0.1 on has to be recreated, so each consumer pinning one of them has to update its lockfile, and copies already fetched stay out of reach."
  - key: keep
    label: Keep them public
    detail: "Nothing moves. The founders' choice to publish quotes and portraits then also covers these records, and the local-documents rule needs an exception for this repository."
---

# Do the portrait review records stay in a public repository?

Say whether the two portrait reports and the open portrait question may stay public.

The repository is public by the founders' choice, for quotes, portraits and marks. The two reports
and the open question go further. They name the quoted clients with a blind-review score for each
person's photo, reviewers' remarks about how each person looks in it, and which of them we might ask
for another picture. One report also cites a Gmail thread ID and the number of mailbox messages read.

The `local-documents` rule says a file in a public repository carries no client or person record and
states only the measurement. The repository's gate passes these files today.

Nothing was moved or edited for this question. A client reaching these pages is a relationship cost,
and the fix needs a write in Company OS. No blind review ran: this is a question of what may be
public, which a panel cannot settle.
