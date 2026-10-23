# gamedev-cobotft

Game prototypes for Boomtown Athletics, hosted on GitHub Pages. Staff testing only.

The only personal data in this repo is what the public Colorado Boom teams page already
shows: a player's first name, the first letters of the last name, and the team title.
`tools/build-roster.mjs` regenerates it from that page; `tools/check.mjs` refuses any other field.

```
node tools/build-roster.mjs   # refresh data/roster.json from the public teams page
node tools/check.mjs          # self-checks, run before every push
```
