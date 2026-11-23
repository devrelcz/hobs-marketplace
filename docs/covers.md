# Team covers

Every team has a cover: the picture the app shows on the team's card and at
the top of its page. Covers share one house style, so the marketplace reads
as one shelf and not a pile of stock art.

## Format

- WebP, 16:9, at least 1200 px wide (1536×864 works well), at most 300 KB.
- `teams/<id>/cover.webp`, named in `team.json` as `"cover": "cover.webp"`.
- Keep the prompt that made it next to it as `cover.prompt.txt`, so the
  cover can be made again or adjusted.

`npm run validate` checks the format, size and aspect ratio.

## House style

- **The members are the picture.** Each member is a Hob: one simple,
  solid-colored geometric shape (circle, rounded square, hexagon, triangle,
  cloud, drop, pill) with two tiny black dot eyes and no mouth, like the
  faces in the app. Small stubby arms only where they hold something.
- **One prop per role** tells what the member does: a roadmap board, a
  clipboard, a laptop, a magnifying glass, a server rack.
- **Colors of the app:** a warm off-white background with moss green
  (`#2F6B4A`) and pale green (`#CDEBD6`) shapes and a few lantern-yellow
  (`#F2B33D`) highlights. Members in clear, friendly colors.
- Flat vector look, very soft shadows, plenty of empty space, every member
  fully inside the frame.
- **No text**, letters, numbers, logos, watermarks, screenshots or people.
  The app writes the team's name next to the picture, in the reader's
  language.

## Match the faces

Give each member in `team.json` the same shape and color it has on the
cover (`face.shape`, `face.color` as `#RRGGBB`). The team then looks the same
in the Hob list as on its card.

## Making one

The dev team's cover came from OpenAI `gpt-image-2.6-flare` (1536×1024,
quality high) with [its prompt](../teams/dev-team/cover.prompt.txt). Any
model that follows the style above is fine. Then crop to 16:9 and convert:

```bash
magick generated.png -gravity center -crop 1536x864+0+0 +repage cover.png
cwebp -q 80 cover.png -o teams/<id>/cover.webp
```

Start a new prompt from the dev team's one: keep the style paragraphs and
change the list of members and their props.
