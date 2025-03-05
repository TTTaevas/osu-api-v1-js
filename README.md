# osu-api-v1-js

[**osu-api-v1-js**](https://github.com/TTTaevas/osu-api-v1-js) is a JavaScript & TypeScript package that helps you interact with the legacy API of osu!, also known as [osu!api (v1)](https://github.com/ppy/osu-api/wiki).

The version 1.0 of the osu!api (which is the one this package interacts with) is old and lacks much of the features of [its new counterpart](https://osu.ppy.sh/docs/). **Please consider using that one instead if you intend on doing more than a script!** To that end, I've developed [osu-api-v2-js](https://github.com/TTTaevas/osu-api-v2-js), a feature-packed package you can switch to today.

You can find detailed documentation about osu-api-v1-js on [osu-v1.taevas.xyz](https://osu-v1.taevas.xyz/)!

## How to install and get started

To install the package, use a command from your package manager:

```bash
npm i osu-api-v1-js # if using npm
yarn add osu-api-v1-js # if using yarn
pnpm add osu-api-v1-js # if using pnpm
bun a osu-api-v1-js # if using bun
```

To use (import) the package in your project and start interacting with the API, you may do something like that:

```typescript
// TypeScript
import * as osu from "osu-api-v1-js"

const api = new osu.API("<your_key>")

async function logUserTopPlayBeatmap(username: string) {
	let scores = await api.getUserBestScores(1, osu.Gamemodes.OSU, {username})
	let beatmap = await api.getBeatmap({beatmap_id: scores[0].beatmap_id}, scores[0].enabled_mods)

	let x = `${beatmap.artist} - ${beatmap.title} [${beatmap.version}]`
	let y = `+${scores[0].enabled_mods.map((m) => osu.Mods[m])} (${beatmap.difficultyrating}*)`
	console.log(`${username}'s top play is on: ${x} ${y}\n`)
	// Doomsday fanboy's top play is on: SHK - Flight of the Bumblebee (RST Classic) [Luscent's Extra] +DOUBLETIME (9.22332*)
}

logUserTopPlayBeatmap("Doomsday fanboy")
```

## Methods of the osu.API object

### await api.getUser()

`api.getUser()` allows you to get a User by specifying a gamemode and a username or an id!

```javascript
// get a `User` for id 7276846 and for the Taiko gamemode
await api.getUser(osu.Gamemodes.TAIKO, {user_id: 7276846})
// get a `User` for username "Log Off Now" and for the osu! gamemode
await api.getUser(osu.Gamemodes.OSU, {username: "Log Off Now"})
```

### await api.getUserBestScores()

`api.getUserBestScores()` allows you to get the best (pp-wise) Scores of a User by specifying the maximum amount of Scores you want, a Gamemode, and a username or an id!

```javascript
// get an array of `Score`s that represent the best 3 scores of the `User` with username "mrekk"
await api.getUserBestScores(3, osu.Gamemodes.OSU, {username: "mrekk"})
// get an array of `Score`s that represent the best 50 scores of the `User` with id 418699
await api.getUserBestScores(50, osu.Gamemodes.OSU, {user_id: 418699})
```

### await api.getUserRecentScores()

`api.getUserRecentScores()` allows you to get the recent or the Scores of a User set during the last 24 hours by specifying the maximum amount of Scores you want, a Gamemode, and a username or an id!

```javascript
// get a `User` for id 7276846 and for the Taiko gamemode
let user = await api.getUser(osu.Gamemodes.TAIKO, {user_id: 7276846})
// get that `User`'s 5 most recent `Score`s (or less if the user has set less than 5 such `Score`s)
let scores = await api.getUserRecentScores(5, osu.Gamemodes.TAIKO, user)
```

### await api.getBeatmap()

`api.getBeatmap()` is a simple function that allows you to get a Beatmap simply by specifying its id! You may specify mods or a gamemode.

```javascript
// get a `Beatmap` for id 557821 with no mod and the gamemode the map was made for
await api.getBeatmap({beatmap_id: 557821})
// get a `Beatmap` for id 243848 with HDDT and convert it to ctb
await api.getBeatmap({beatmap_id: 243848}, [osu.Mods.HIDDEN, osu.Mods.DOUBLETIME], osu.Gamemodes.CTB)
```

### await api.getBeatmaps()

`api.getBeatmaps()` is a relatively complex function that allows you to get an array of Beatmaps in a number of ways. You will need to specify how many beatmaps (max) should be in the array (can't be over 500) and the gamemode they should be in.

You can specify the id of a beatmapset or of a beatmap, the mods to apply to the Beatmaps, the user that owns the beatmapsets, and you can filter out maps that have been approved/ranked/loved before a specific date, which also filters out beatmaps that have not reached such a state yet.

```javascript
// get the 5 latest submitted beatmaps
await api.getBeatmaps(5, {gamemode: "all"})
// get all `Beatmap`s with beatmapset id 1932215 (in other words, all of its difficulties)
await api.getBeatmaps(500, {gamemode: osu.Gamemodes.OSU}, {beatmapset_id: 1932215})
// get all `Beatmap`s of beatmapsets of Sotarks that have been ranked since 2023 and convert them to the taiko gamemode
await api.getBeatmaps(500, {gamemode: osu.Gamemodes.TAIKO, allow_converts: true}, undefined, undefined, {username: "Sotarks"}, new Date("2023"))
```

### await api.getBeatmapScores()

`api.getBeatmapScores()` allows you to get filtered scores that have been set on a specific beatmap and gamemode. You can specify a User, mods, and a maximum amount of scores to get.

```javascript
// get an array of `Score`s that represent the best 100 (max) scores on beatmap with id 243848 on the osu! gamemode
await api.getBeatmapScores(100, osu.Gamemodes.OSU, {beatmap_id: 243848})
// get an array of `Score`s that represent the best 5 (max) scores on beatmap with id 243848 with flashlight on the ctb gamemode
await api.getBeatmapScores(5, osu.Gamemodes.CTB, {beatmap_id: 243848}, undefined, [osu.Mods.FLASHLIGHT])
// get an array of `Score`s that represent the best 100 (max) scores on beatmap with id 932936 from user with id 7276846 on the osu! gamemode
// don't do it IRL
await api.getBeatmapScores(100, osu.Gamemodes.OSU, {beatmap_id: 932936}, {user_id: 7276846})
```

### await api.getMatch()

`api.getMatch` allows you to get a Match by using its id!

```javascript
// get a `Match` for id 106369699
await api.getMatch(106369699)
```

### await api.getReplay()

NOTE: This is heavily rate-limited by the servers, so avoid using it multiple times per minute!

`api.getReplay()` allows you to get **the data** of a replay of a score, if available. You can do that by specifying the id of that score, or by specifying which User did the score on which Beatmap with which mods.

```javascript
// get a `Replay` for score id 2177560145 on the osu! gamemode
await api.getReplay(osu.Gamemodes.OSU, {score_id: 2177560145})
// get a `Replay` for user id 124493, beatmap id 129891, with mods HDHR
await api.getReplay(osu.Gamemodes.OSU, {search: {user: {user_id: 124493}, beatmap: {beatmap_id: 129891}, mods: [osu.Mods.HIDDEN, osu.Mods.HARDROCK]}})
// same as above!
let user = await api.getUser(osu.Gamemodes.OSU, {user_id: 124493})
let beatmap = await api.getBeatmap({beatmap_id: 129891})
let replay = await api.getReplay(osu.Gamemodes.OSU, {search: {user, beatmap, mods: [osu.Mods.HIDDEN, osu.Mods.HARDROCK]}})
```

## Convenient functions

Outside of the API class, there are functions made to make your life easier if you're ever in need of them!

### Mods.adjustBeatmapStats()

`Mods.adjustBeatmapStats()` adjusts the CS, AR, OD, HP, Length and BPM of a map to one or multiple mods, without making a request to the API servers.

```javascript
// Adjust beatmap of id 557821 to HRDT
let beatmap_nm = await api.getBeatmap({beatmap_id: 557821}) //.diff_size = 4 (circle size / CS)
let beatmap_hr = osu.Mods.adjustBeatmapStats(beatmap_nm, [osu.Mods.HARDROCK, osu.Mods.DOUBLETIME]) //.diff_size = 5.2 (circle size / CS)
```

### getLength()

`getLength()` converts seconds to a string in hh:mm:ss format, which can be useful to make a beatmap's length readable.

```javascript
// Log the length of beatmap of id 557821
let beatmap = await api.getBeatmap({beatmap_id: 557821})
console.log(osu.getLength(beatmap.total_length)) // 3:27
```

### getURL

`getURL` is an Object with many straight-forward functions that allow you to get a URL to an image (beatmap cover, profile picture...) or a URL that interacts with the osu! game client. (opening osu!direct, spectate a user...)

```javascript
// Get the URL of a Beatmap's rectangular cover
let cover = osu.getURL.beatmapCoverImage({beatmapset_id: 1190710}) // https://assets.ppy.sh/beatmaps/1190710/covers/cover.jpg
// Get the URL that opens osu!direct to a Beatmap
let beatmap_url = osu.getURL.toOpen.beatmap({beatmap_id: 1095507}) // osu://b/1095507
```
