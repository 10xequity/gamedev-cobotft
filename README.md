# gamedev-cobotft

Game prototypes for Boomtown Athletics, hosted on GitHub Pages. Staff testing only.

The only personal data in this repo is what the public Colorado Boom teams page already
shows: a player's first name, the first letters of the last name, and the team title.
`tools/build-roster.mjs` regenerates it from that page; `tools/check.mjs` refuses any other field.

```
node tools/build-roster.mjs   # refresh data/roster.json from the public teams page
node tools/check.mjs          # self-checks, run before every push
node tools/balance-sim.mjs    # win matrix of the 8 test lines + game length from 20 bot games
```

To try balance numbers without editing the config, pass overrides as JSON:
`BAL='{"abilities":{"Tip":{"mult":0.9}}}' node tools/balance-sim.mjs`.

After any change to the game folder, bump the `?v=` version string in both pages (every
occurrence, including the import map); `tools/check.mjs` fails if a page mixes versions.

The game works offline once visited (`tft-wcni4yex/sw.js`) and can be added to a phone's home
screen. Releases must bump the version in `sw.js` together with the pages; the check enforces it.
