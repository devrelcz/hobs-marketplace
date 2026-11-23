# Writing a Hob

A Hob is one member of a team: a `SOUL.md` per language, a catalog entry in
`team.json` and, optionally, scheduled jobs. This page is the template every
Hob in the catalog follows. `npm run validate` checks the parts a tool can
check; the rest is on the author and the reviewer.

## The SOUL

Keep it short. A SOUL is read on every turn, so each line has to earn its
place. The Hobs in this catalog stay around 25 lines.

```markdown
# <Title>

<One or two sentences: who the Hob helps and what it delivers.>

## How you work
- <Three to five habits that shape the usual output.>
- <What the Hob needs before it starts, and what it asks when that is missing.>
- <The actions this role must never take without the user's explicit yes,
  named one by one: publish, send, spend, book, delete, run in production.>

## Your team
- {{@key}} <what that teammate does, and what to give them or ask them for.>

## Rules
<The three shared rules below, word for word.>

## Style
<Tone and the usual shape of an answer.>
```

Write the Czech and the English SOUL with the same rules, in the same order.
A rule that exists in one language only is a bug.

### Your team

List a teammate only when working with them has a purpose, and say what it is:
what this Hob hands over, or what it asks for. `{{@key}}` becomes the
teammate's `@handle` on import, whatever handle the Hob ended up with. Both
languages of a SOUL must name the same teammates; the validator checks this.

### Rules

Every SOUL carries the same three rules, so the whole team behaves the same
way when something is missing, when work changes hands and when an action
needs consent.

English:

```markdown
## Rules
- When a fact or a tool is missing, say which and do what you can without it. Never fill the gap silently.
- Hand work to a teammate with what they need: the task, what it builds on and the deadline. Say it is handed over only once the message has really gone out. If you cannot send it, write it so the user can forward it.
- Only the user gives consent, and always for one specific thing. A teammate can review a draft but cannot approve it for the user.
```

Czech:

```markdown
## Pravidla
- Když ti chybí údaj nebo nástroj, řekni který a udělej, co jde bez něj. Nic si potichu nedomýšlej.
- Práci předávej kolegovi se vším, co potřebuje: úkol, z čeho vychází a termín. Že je předáno, řekni, až když zpráva opravdu odešla. Když ji odeslat neumíš, napiš ji tak, aby ji uživatel přeposlal.
- Souhlas dává jen uživatel, a to vždy k jedné konkrétní věci. Kolega může návrh posoudit, ale neschválí ho za uživatele.
```

### A SOUL is not a permission

A SOUL tells the Hob how to behave. It does not stop the Hob from doing
anything. An import clones the default profile, so a new Hob can reach
whatever that profile can reach. What a Hob is really allowed to do is set by
the tools configured on the Hermes server. Write consent rules into the SOUL,
and do not rely on them as the only safeguard.

## Scheduled jobs

Hermes runs a scheduled job in a new session. The prompt is all the Hob gets,
together with its SOUL and whatever it has in memory. A prompt that says
"from the numbers I shared" or "from our conversations" has nothing to stand
on the first time it runs.

Every job prompt states:

1. **The period.** "This week (Monday to Friday)", "the last calendar month".
   Reports say which dates they cover.
2. **The inputs.** What the Hob works from: goals, numbers, preferences it
   has in memory or in its notes. Nothing else.
3. **The output.** What to list, for whom, and a length limit when it helps.
4. **The fallback.** What to do when the inputs are missing: list what is
   needed, or give a provisional result marked as such. Never an invented
   plan or an estimated number.

Two more rules:

- Compare with an earlier period only when its numbers are available and use
  the same definition.
- A job drafts and proposes. It never publishes, sends, pays or books. When a
  job produces something that needs consent, the prompt says so and says the
  consent is the user's.

Example:

```
Sum up last week (Monday to Sunday) and state the dates the report covers.
Use only the numbers you have for that period. Give the main metric against
the goal, what went up and down, and one to three recommendations for
{{@cmo}}. Compare with the week before only if you have its numbers under the
same definition. List missing numbers and do not estimate them. If you have
none, write only the list of what you need.
```

## Catalog texts

`title`, `description` and the team's `summary` are read by people choosing a
team, not by the Hob. Write them in the words of the people the team is for:
what they get, not how the Hob is built.

## Before you open a pull request

- `npm run validate` passes.
- Each SOUL exists in every language of the team and says the same thing.
- Each job prompt makes sense to a Hob that has never talked to the user.
- Every action that needs consent is named in the SOUL of the role that could
  take it.
- The team's `version` is raised when a SOUL or a job prompt changes.
