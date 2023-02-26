# osu-api-v1-js

**osu-api-v1-js** is a JavaScript & TypeScript package that helps you interact with [osu!api (v1)](https://github.com/ppy/osu-api/wiki).

## How to install and get started

To install the package, use a command from your package manager:

```bash
npm i osu-api-v1-js # if using npm
```
```bash
yarn add osu-api-v1-js # if using yarn
```

To use (import) the package in your project and start interacting with the API, you may do something like that:

```javascript
/// JavaScript
const osu = require("osu-api-v1-js")

const api = new osu.API("<your_key>")

async function logUserTopPlayBeatmap(username) {
	let scores = await api.getUserScores({username}, osu.Gamemodes.OSU, "best", 1)
	if (scores instanceof osu.APIError) {throw new Error(scores.message)}
	let beatmap = await api.getBeatmap({beatmap_id: scores[0].beatmap_id}, scores[0].enabled_mods)
	if (beatmap instanceof osu.APIError) {throw new Error(beatmap.message)}
	
	let x = `${beatmap.artist} - ${beatmap.title} [${beatmap.version}]`
	let y = `+${osu.getMods(scores[0].enabled_mods)} (${beatmap.difficultyrating}*)`
	console.log(`${username}'s top play is on: ${x} ${y}\n`)
	// Doomsday fanboy's top play is on: xi - FREEDOM DiVE [FOUR DIMENSIONS] +HardRock (8.0688*)
}

logUserTopPlayBeatmap("Doomsday fanboy")
```

```typescript
// TypeScript
import * as osu from "osu-api-v1-js"

const api = new osu.API("<your_key>")

async function logUserTopPlayBeatmap(username: string) {
	// same as JavaScript
}

logUserTopPlayBeatmap("Doomsday fanboy")
```
## Functions of the osu.API object

### await api.getUser()

`api.getUser()` allows you to get an User by specifying a gamemode and an username or an id!

```javascript
// get an `User` for id 7276846 and for the Taiko gamemode
await api.getUser(osu.Gamemodes.TAIKO, {user_id: 7276846})
// get an `User` for username "Log Off Now" and for the osu! gamemode
await api.getUser(osu.Gamemodes.OSU, {username: "Log Off Now"})
```

### await api.getUserScores()

`api.getUserScores()` allows you to get the recent or the best Scores of an User by specifying a Gamemode, an username or an id, and whether you want their recent Scores or their best Scores, plus how many Scores you want. (from 1 to 100)

```javascript
// get an array of `Score`s that represent the best 3 scores of the `User` with username "mrekk"
await api.getUserScores(osu.Gamemodes.OSU, {username: "mrekk"}, "best", 3)

// get an `User` for id 7276846 and for the Taiko gamemode
let user = await api.getUser(osu.Gamemodes.TAIKO, {user_id: 7276846})
// get that `User`'s 5 recent `Score`s
let scores = await api.getUserScores(osu.Gamemodes.TAIKO, user, "recent", 5)
```

### await api.getBeatmap()

`api.getBeatmap()` is a simple function that allows you to get a Beatmap simply by specifying its id! You may specify mods or a gamemode.

```javascript
// get a `Beatmap` for id 557821 with no mod and the gamemode the map was made for
await api.getBeatmap({beatmap_id: 557821})
// get a `Beatmap` for id 243848 with HDDT and convert it to ctb
await api.getBeatmap({beatmap_id: 243848}, osu.Mods.Hidden + osu.Mods.DoubleTime, osu.Gamemodes.CATCH)
```

### await api.getBeatmaps()

`api.getBeatmaps()` is a relatively complex function that allows you to get an array of Beatmaps in a number of ways. You will need to specify how many beatmaps (max) should be in the array (can't be over 500) and the gamemode they should be in.

You can specify the id of a beatmapset or of a beatmap, the mods to apply to the Beatmaps, the user that owns the beatmapsets, and you can filter out maps that have been approved/ranked/loved before a specific date, which also filters out beatmaps that have not reached such a state yet.

```javascript
// get the 5 latest submitted beatmaps
await api.getBeatmaps(5, osu.Gamemodes.OSU)
// get all `Beatmap`s with beatmapset id 1932215 (in other words, all of its difficulties)
await api.getBeatmaps(500, osu.Gamemodes.OSU, {beatmapset_id: 1932215})
// get all `Beatmap`s of beatmapsets of Sotarks that have been ranked since 2023 and convert them to the taiko gamemode
await api.getBeatmaps(500, osu.Gamemodes.TAIKO, undefined, undefined, {username: "Sotarks"}, new Date("2023"))
```

### await api.getBeatmapScores()

`api.getBeatmapScores()` allows you to get filtered scores that have been set on a specific beatmap and gamemode. You can specify an User, mods, and a maximum amount of scores to get.

```javascript
// get an array of `Score`s that represent the best 100 (max) scores on beatmap with id 243848 on the osu! gamemode
await api.getBeatmapScores(osu.Gamemodes.OSU, {beatmap_id: 243848})
// get an array of `Score`s that represent the best 5 (max) scores on beatmap with id 243848 with flashlight on the ctb gamemode
await api.getBeatmapScores(osu.Gamemodes.CTB, {beatmap_id: 243848}, osu.Mods.Flashlight, undefined, 5)
// get an array of `Score`s that represent the best 100 (max) scores on beatmap with id 932936 from user with id 7276846 on the osu! gamemode
// don't do it IRL
await api.getBeatmapScores(osu.Gamemodes.OSU, {beatmap_id: 932936}, undefined, {user_id: 7276846}, 100)
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
await api.getReplay(osu.Gamemodes.OSU, {user: {user_id: 124493}, beatmap: {beatmap_id: 129891}, osu.Mods.Hidden + osu.Mods.HardRock})
// same as above!
let user = await api.getUser(osu.Gamemodes.OSU, {user_id: 124493})
let beatmap = await api.getBeatmap({beatmap_id: 129891})
let replay = await api.getReplay(osu.Gamemodes.OSU, {user, beatmap, osu.Mods.Hidden + osu.Mods.HardRock})
```

## Convenient functions

Outside of the API class, and of the Mods and Gamemodes enums, are functions made to make your life easier if you're ever in need of them!

### getMods()

`getMods()` allows you to get an array of strings, each string being a mod, by giving it a number that corresponds to the mods.

```javascript
// Log the mods used in each of the top 100 scores on beatmap of id 243848
let scores = await api.getBeatmapScores(osu.Gamemodes.OSU, {beatmap_id: 243848})
scores.forEach((s) => console.log(getMods(s.enabled_mods))) // Hidden,HardRock,FlashLight (for 1st iteration)
```

### getLength()

`getLength()` converts seconds to a string in m:ss format, which can be useful if used to read a Beatmap's length

```javascript
// Log the length of beatmap of id 557821
let beatmap = await api.getBeatmap({beatmap_id: 557821})
console.log(getLength(beatmap.total_length)) // 3:27
```
