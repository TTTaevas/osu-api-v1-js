import "dotenv/config"
import * as osu from "./index.js"
import { unsupported_mods } from "./mods.js"

const key = process.env.KEY
if (key === undefined) {throw new Error("❌ The API key has not been defined in the environment variables! (name of the variable is `KEY`)")}
const api = new osu.API(key, "all")
const bad_id = -1

// shamelessly copied from https://stackoverflow.com/a/15762794
function roundTo(n: number, digits: number) {
	let negative = false
	if (n < 0) {
		negative = true
		n *= -1
	}
	let multiplicator = Math.pow(10, digits)
	n = parseFloat((n * multiplicator).toFixed(11))
	let x = (Math.round(n) / multiplicator).toFixed(digits)
	if (negative) {x = (Number(x) * -1).toFixed(digits)}
	return Number(x)
}

async function attempt<T>(msg: string, fun: Promise<any>): Promise<T | false> {
	process.stdout.write(msg)
	try {
		let result = await fun
		return result
	} catch(err) {
		console.error(err)
		return false
	}
}


/**
 * Check if getUser() works fine 
 */
const testGetUser = async (): Promise<boolean> => {
	const user_id = 7276846
	let normal = await <Promise<ReturnType<typeof api.getUser> | false>>attempt(
		"\nRequesting a normal User: ", api.getUser(osu.Gamemodes.OSU, {user_id})
	)

	if (!normal) {return false}
	if (normal.user_id !== user_id) {
		console.error("❌ Bad response")
		return false
	}

	let bad = await <Promise<ReturnType<typeof api.getUser> | false>>attempt(
		"Requesting a bad User: ", api.getUser(osu.Gamemodes.MANIA, {user_id: bad_id})
	)
	return !Boolean(bad)
}

/**
 * Check if getMatch() works fine
 */
const testGetMatch = async (): Promise<boolean> => {
	const match_name = "IT: (tout le monde) vs (Adéquat feur)"
	let normal = await <Promise<ReturnType<typeof api.getMatch> | false>>attempt(
		"\nRequesting a normal Match: ", api.getMatch(106369699)
	)

	if (!normal) {return false}
	if (normal.match.name !== match_name) {
		console.error("❌ Bad response")
		return false
	}

	let bad = await <Promise<ReturnType<typeof api.getMatch> | false>>attempt(
		"Requesting a bad Match: ", api.getMatch(bad_id)
	)
	return !Boolean(bad)
}

/**
 * Check if getBeatmap() works fine
 */
const testGetBeatmap = async (): Promise<boolean> => {
	const song_name = "FriendZoned"
	let normal = await <Promise<ReturnType<typeof api.getBeatmap> | false>>attempt(
		"\nRequesting a normal Beatmap: ", api.getBeatmap({beatmap_id: 892780})
	)

	if (!normal) {return false}
	if (normal.title !== song_name) {
		console.error("❌ Bad response")
		return false
	}

	let bad = await <Promise<ReturnType<typeof api.getBeatmap> | false>>attempt(
		"Requesting a bad Beatmap: ", api.getBeatmap({beatmap_id: bad_id})
	)
	return !Boolean(bad)
}

/**
 * Check if adjustBeatmapStatsToMods works fine
 */
const testModdedBeatmap = async (): Promise<boolean> => {
	let success = true
	let beatmap = await <Promise<ReturnType<typeof api.getBeatmap> | false>>attempt(
		"\nRequesting another normal Beatmap once in order to change its stats with mods: ", api.getBeatmap({beatmap_id: 2592029}, osu.Mods.NOFAIL)
	)
	if (!beatmap) {return false}
	
	// Expected AR is specified on: https://osu.ppy.sh/wiki/en/Beatmap/Approach_rate#table-comparison
	// Expected OD is specified on: https://osu.ppy.sh/wiki/en/Beatmap/Overall_difficulty#osu!
	const dtnc = [osu.Mods.DOUBLETIME, osu.Mods.NIGHTCORE]
	for (let i=0;i<dtnc.length;i++) {if (!testBeatmapWithMods(beatmap, dtnc[i], {bpm: 294, cs: 3, ar: 9, od: 8.44, hp: 4})) {success=false}}
	if (!testBeatmapWithMods(beatmap, osu.Mods.HALFTIME, {bpm: 147, cs: 3, ar: 5, od: 3.56, hp: 4})) {success = false}
	if (!testBeatmapWithMods(beatmap, osu.Mods.EASY, {bpm: 196, cs: 1.5, ar: 3.5, od: 3, hp: 2})) {success = false}
	if (!testBeatmapWithMods(beatmap, osu.Mods.HARDROCK, {bpm: 196, cs: 3.9, ar: 9.8, od: 8.4, hp: 5.6})) {success = false}
	for (let i=0;i<dtnc.length;i++) {if (!testBeatmapWithMods(beatmap, dtnc[i] + osu.Mods.EASY, {bpm: 294, cs: 1.5, ar: 6.87, od: 6.44, hp: 2})) {success=false}}
	for (let i=0;i<dtnc.length;i++) {if (!testBeatmapWithMods(beatmap, dtnc[i] + osu.Mods.HARDROCK, {bpm: 294, cs: 3.9, ar: 10.87, od: 10.04, hp: 5.6})) {success=false}}
	if (!testBeatmapWithMods(beatmap, osu.Mods.HALFTIME + osu.Mods.EASY, {bpm: 147, cs: 1.5, ar: -0.33, od: -0.44, hp: 2})) {success = false}
	if (!testBeatmapWithMods(beatmap, osu.Mods.HALFTIME + osu.Mods.HARDROCK, {bpm: 147, cs: 3.9, ar: 8.73, od: 6.76, hp: 5.6})) {success = false}

	console.log("\nThis beatmap will get requested several times with different mods in order to see if its SR does not bug")
	for (const [key, value] of Object.entries(osu.Mods).splice(0, Object.entries(osu.Mods).length / 2)) {
		// The solution used in getBeatmap() is to simply remove the unsupported mod(s) from the request
		// So if we were to request a beatmap with such a mod here, we'd be requesting it with NM instead
		// I honestly just don't wanna make the same request in a row ~15 times :skull:
		if (unsupported_mods.includes(Number(key))) {
			console.log("The following mod will not be requested as it'd be pointless:", osu.getMods(Number(key)))
			continue
		}
		
		let modded_beatmap = await <Promise<ReturnType<typeof api.getBeatmap> | false>>attempt(
			`Requesting SR of Beatmap with mod ${value}: `, api.getBeatmap(beatmap, Number(key))
		)
		if (!modded_beatmap) {return false}
		if (modded_beatmap.difficultyrating === 0) {
			console.error(`❌ Beatmaps with the mod ${value} have a difficultyrating of 0!`)
			return false
		}
	}
	return success
}

/**
 * Check if getBeatmapScores works fine
 */
const testGetBeatmapScores = async (): Promise<boolean> => {
	const score_amount = 132408001
	let normal = await <Promise<ReturnType<typeof api.getBeatmapScores> | false>>attempt(
		"\nRequesting scores from a normal Beatmap: ",
		api.getBeatmapScores(5, osu.Gamemodes.OSU, {beatmap_id: 129891}, {user_id: 124493}, osu.Mods.HIDDEN + osu.Mods.HARDROCK)
	)

	if (!normal) {return false}
	if (normal[0].score < score_amount) {
		console.error("❌ Bad response")
		return false
	}

	let bad = await <Promise<ReturnType<typeof api.getBeatmapScores> | false>>attempt(
		"Requesting scores from a bad Beatmap: ",
		api.getBeatmapScores(5, osu.Gamemodes.OSU, {beatmap_id: bad_id})
	)
	return !Boolean(bad)
}

/**
 * Check if getUserScores works fine
 */
const testGetUserScores = async (): Promise<boolean> => {
	const scores_limit = 10
	let normal = await <Promise<ReturnType<typeof api.getBeatmapScores> | false>>attempt(
		"\nRequesting the best scores of a normal User: ",
		api.getUserScores(scores_limit, osu.Gamemodes.OSU, {user_id: 2}, "best")
	)

	if (!normal) {return false}
	if (normal.length !== scores_limit) {
		console.error("❌ Bad response")
		return false
	}

	let bad = await <Promise<ReturnType<typeof api.getBeatmapScores> | false>>attempt(
		"Requesting the best scores of a bad User: ",
		api.getUserScores(scores_limit, osu.Gamemodes.TAIKO, {user_id: bad_id}, "best")
	)
	if (bad) {return false}

	let _normal_recents = await <Promise<ReturnType<typeof api.getBeatmapScores> | false>>attempt(
		"\nRequesting the recent scores from a normal User: ",
		api.getUserScores(scores_limit, osu.Gamemodes.CTB, {user_id: 2}, "recent")
	)
	let bad_recents = await <Promise<ReturnType<typeof api.getBeatmapScores> | false>>attempt(
		"Requesting the recent scores from a bad User: ",
		api.getUserScores(scores_limit, osu.Gamemodes.MANIA, {user_id: bad_id}, "recent")
	)
	return !Boolean(bad_recents)
}

/**
 * Check if getReplay works fine
 */
const testGetReplay = async (): Promise<boolean> => {
	let normal = await <Promise<ReturnType<typeof api.getReplay> | false>>attempt(
		"\nRequesting the Replay from a normal score: ", api.getReplay(osu.Gamemodes.OSU, {score: {score_id: 2177560145}})
	)

	if (!normal) {return false}
	if (normal.content.length < 1000) {
		console.error("❌ Bad response")
		return false
	}

	let bad = await <Promise<ReturnType<typeof api.getReplay> | false>>attempt(
		"Requesting the Replay from a bad score: ", api.getReplay(osu.Gamemodes.TAIKO, {score: {score_id: bad_id}})
	)
	return !Boolean(bad)
}

const test = async (): Promise<void> => {
	let u = await testGetUser()
	let m = await testGetMatch()
	let b = await testGetBeatmap()
	let mb = await testModdedBeatmap()
	let bs = await testGetBeatmapScores()
	let us = await testGetUserScores()
	let r = await testGetReplay()

	let test_results = [u, m, b, mb, bs, us, r].map((bool: boolean, index: number) => bool ? `${index + 1}: ✔️\n` : `${index + 1}: ❌\n`)
	console.log("\n", ...test_results)
	if ([u, m, b, mb, bs, us, r].indexOf(false) === -1) {
		console.log("✔️ Looks like the test went well!")
	} else {
		throw new Error("❌ Something in the test went wrong...")
	}
}

const testBeatmapWithMods = (b: osu.Beatmap, mods: osu.Mods, expected: object) => {
	let bm = osu.adjustBeatmapStatsToMods(b, mods)
	let stats = {
		bpm: roundTo(bm.bpm, 2),
		cs: roundTo(bm.diff_size, 2),
		ar: roundTo(bm.diff_approach, 2),
		od: roundTo(bm.diff_overall, 2),
		hp: roundTo(bm.diff_drain, 2)
	}
	if (JSON.stringify(stats) !== JSON.stringify(expected)) {
		console.log("Expected", expected, "but got", stats)
		console.error(`❌ The beatmap's stats with the mods ${osu.getMods(mods)} are not what they should be!\n`)
		return false
	} else if (bm.difficultyrating <= 0) {
		console.error(`❌ The beatmap's star rating with the mods ${osu.getMods(mods)} is 0* or below! (it's ${bm.difficultyrating})`)
		return false
	} else {
		console.log(osu.getMods(mods), "Beatmaps' stats are looking good!")
		return true
	}
}

test()
