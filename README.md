# Hobs Marketplace

Ready-made teams of Hobs for [Hermes Hobs](https://github.com/devrelcz/hermes-hobs).

Pick a team in the app and it is set up in one tap. Each member becomes a Hob
(a Hermes Agent profile) with its own role, SOUL.md and face. The team gets a
folder of its own and a group chat with every member in it. Scheduled jobs
come along too, switched off until you turn them on.

The teams live here and not in the app, so a new team needs no app release.

## Teams

| | Team | Members |
| --- | --- | --- |
| <img src="teams/dev-team/cover.webp" width="240" alt="Dev team"> | [Dev team](teams/dev-team/team.json) | Head of IT, analyst, developer, tester, DevOps |
| <img src="teams/personal-team/cover.webp" width="240" alt="Personal team"> | [Personal team](teams/personal-team/team.json) | Assistant, chef, traveler, budget keeper, coach |

## How the app reads the catalog

The app fetches the catalog through jsDelivr, pinned to a major-version tag:

```
https://cdn.jsdelivr.net/gh/devrelcz/hobs-marketplace@v1/index.json
https://cdn.jsdelivr.net/gh/devrelcz/hobs-marketplace@v1/teams/<id>/team.json
https://cdn.jsdelivr.net/gh/devrelcz/hobs-marketplace@v1/teams/<id>/souls/<file>.md
https://cdn.jsdelivr.net/gh/devrelcz/hobs-marketplace@v1/teams/<id>/cover.webp
```

Nothing reaches users until a new `v1.x.y` tag is pushed. A breaking change to
the format bumps `schema` and moves to a `v2` tag, so older apps keep reading
`v1`.

`index.json` holds one card per team for the list, with the path to its cover. The app loads a team's
`team.json` and SOUL files only when you open it.

## Layout

```
index.json                     generated from the teams, do not edit by hand
schema/team.schema.json        format of a team
schema/index.schema.json       format of the catalog
teams/<id>/team.json           one team
teams/<id>/souls/<key>.<lang>.md
teams/<id>/cover.webp          the team's picture (docs/covers.md)
teams/<id>/cover.prompt.txt    the prompt that made it
tools/validate.mjs             checks everything, rebuilds index.json
```

## Team format

See [schema/team.schema.json](schema/team.schema.json) for every field. In short:

- **Texts** are objects keyed by language: `{"en": "…", "cs": "…"}`. English is
  required and is the fallback. Every text in a team covers the same languages
  as the team's `name`.
- **cover**: a WebP picture, 16:9, at least 1200 px wide, at most 300 KB,
  in the [house style](docs/covers.md).
- **members**: two to six, the most a group chat seats. Each has a `key` (stable
  inside the team), a preferred `handle` (the Hermes profile name), `title`,
  `description`, `soul` (a SOUL.md per language) and optionally `face`, `model`
  and `jobs`.
- **handle**: the app adds `-2`, `-3`… when a Hob of that name already exists.
- **face.shape**: `circle`, `blob`, `squircle`, `pill`, `triangle`, `hexagon`,
  `cloud`, `drop`, or `blobatar[:<seed>[:<kind>]]`. **face.color**: `#RRGGBB` or
  `hsl(H S% L%)`; a blobatar ignores it.
- **model**: a hint. The app takes the first `prefer` entry (`provider/model`)
  the server offers, otherwise the Hob inherits the default profile's model.
- **jobs**: `schedule` is a five-field cron expression or `every <n>m|h|d`. The
  app creates jobs switched off.
- **Placeholders**: `{{@key}}` in a SOUL or a job prompt becomes `@handle` of
  that member after import, whatever handle it ended up with.

## What an import does

1. Works out a free handle for every member and shows the full plan, SOULs
   and job prompts included.
2. Creates each member with `profiles.create`, cloned from the default profile,
   with its SOUL.md and description in the user's language.
3. Writes the face, title, folder and the team's origin (`id`, `version`,
   `key`) to the Hob's `ui_meta`.
4. Sets the model when a preferred one is available.
5. Adds the jobs with `cron.manage`, switched off.
6. Seats every member in a new group chat with `groups.create`.

If a step fails, the app offers to finish the rest or remove what it created.

## Adding a team

1. Create `teams/<id>/team.json`, its SOUL files and its
   [cover](docs/covers.md). Copy the dev team as a start.
2. Run the checks and rebuild the index:

   ```bash
   npm install
   npm run index
   npm run validate
   ```

3. Open a pull request. CI runs the same checks.

A SOUL and a job prompt are instructions an agent with tools follows on
someone's server. Review them as you would review code: no hidden
instructions, no requests to send data anywhere, nothing destructive.

## License

MIT
