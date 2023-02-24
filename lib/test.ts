import "dotenv/config"
import * as osu from "./index"
import { unsupported_mods } from "./mods"

const key = process.env.KEY
if (key === undefined) {throw new Error("The API key has not been defined in the environment variables! (name of the variable is `KEY`)")}
const api = new osu.API(key, true)
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


/**
 * Check if getUser() works fine 
 */
const testGetUser: () => Promise<Boolean> = async (): Promise<Boolean> => {
	const user_id = 7276846
	process.stdout.write("\nRequesting a normal User: ")
	let user = await api.getUser({user_id}, osu.Gamemodes.OSU)
	if (user instanceof osu.APIError) {
		console.error(`Got an APIError: ${user.message}`)
		return false
	}
	if (user.user_id !== user_id) {
		console.error(`The user's id is not what it should be!
		Expected: ${user_id}
		Got: ${user.user_id}`)
		return false
	}
	process.stdout.write("Requesting a bad User: ")
	if (!(await api.getUser({user_id: bad_id}, osu.Gamemodes.MANIA) instanceof osu.APIError)) {
		console.error("Expected an APIError upon requesting a bad User")
		return false
	}
	return true
}

/**
 * Check if getMatch() works fine
 */
const testGetMatch: () => Promise<Boolean> = async (): Promise<Boolean> => {
	const match_name = "IT: (tout le monde) vs (Adéquat feur)"
	process.stdout.write("\nRequesting a normal Match: ")
	let match = await api.getMatch(106369699)
	if (match instanceof osu.APIError) {
		console.error(`Got an APIError: ${match.message}`)
		return false
	}
	if (match.match.name !== match_name) {
		console.error(`The match's name is not what it should be!
		Expected: ${match_name}
		Got: ${match.match.name}`)
		return false
	}
	process.stdout.write("Requesting a bad Match: ")
	if (!(await api.getMatch(bad_id) instanceof osu.APIError)) {
		console.error("Expected an APIError upon requesting a bad Match")
		return false
	}
	return true
}

/**
 * Check if getBeatmap() works fine
 */
const testGetBeatmap: () => Promise<Boolean> = async (): Promise<Boolean> => {
	const song_name = "FriendZoned"
	process.stdout.write("\nRequesting a normal Beatmap: ")
	let beatmap = await api.getBeatmap({beatmap_id: 892780})
	if (beatmap instanceof osu.APIError) {
		console.error(`Got an APIError: ${beatmap.message}`)
		return false
	}
	if (beatmap.title !== song_name) {
		console.error(`The beatmap's song name is not what it should be!
		Expected: ${song_name}
		Got: ${beatmap.title}`)
		return false
	}
	process.stdout.write("Requesting a bad Beatmap: ")
	if (!(await api.getBeatmap({beatmap_id: bad_id}) instanceof osu.APIError)) {
		console.error("Expected an APIError upon requesting a bad Beatmap")
		return false
	}
	return true
}

/**
 * Check if adjustBeatmapStatsToMods works fine
 */
const testModdedBeatmap: () => Promise<Boolean> = async (): Promise<Boolean> => {
	process.stdout.write("\nRequesting another normal Beatmap once in order to change its stats with mods: ")
	let success = true
	let beatmap = await api.getBeatmap({beatmap_id: 2592029}, osu.Mods.NoFail)
	if (beatmap instanceof osu.APIError) {
		console.error(`Got an APIError: ${beatmap.message}`)
		return false
	}
	
	// Expected AR is specified on: https://osu.ppy.sh/wiki/en/Beatmap/Approach_rate#table-comparison
	// Expected OD is specified on: https://osu.ppy.sh/wiki/en/Beatmap/Overall_difficulty#osu!
	const dtnc = [osu.Mods.DoubleTime, osu.Mods.Nightcore]
	for (let i=0;i<dtnc.length;i++) {if (!testBeatmapWithMods(beatmap, dtnc[i], {bpm: 294, cs: 3, ar: 9, od: 8.44, hp: 4})) {success=false}}
	if (!testBeatmapWithMods(beatmap, osu.Mods.HalfTime, {bpm: 147, cs: 3, ar: 5, od: 3.56, hp: 4})) {success = false}
	if (!testBeatmapWithMods(beatmap, osu.Mods.Easy, {bpm: 196, cs: 1.5, ar: 3.5, od: 3, hp: 2})) {success = false}
	if (!testBeatmapWithMods(beatmap, osu.Mods.HardRock, {bpm: 196, cs: 3.9, ar: 9.8, od: 8.4, hp: 5.6})) {success = false}
	for (let i=0;i<dtnc.length;i++) {if (!testBeatmapWithMods(beatmap, dtnc[i] + osu.Mods.Easy, {bpm: 294, cs: 1.5, ar: 6.87, od: 6.44, hp: 2})) {success=false}}
	for (let i=0;i<dtnc.length;i++) {if (!testBeatmapWithMods(beatmap, dtnc[i] + osu.Mods.HardRock, {bpm: 294, cs: 3.9, ar: 10.87, od: 10.04, hp: 5.6})) {success=false}}
	if (!testBeatmapWithMods(beatmap, osu.Mods.HalfTime + osu.Mods.Easy, {bpm: 147, cs: 1.5, ar: -0.33, od: -0.44, hp: 2})) {success = false}
	if (!testBeatmapWithMods(beatmap, osu.Mods.HalfTime + osu.Mods.HardRock, {bpm: 147, cs: 3.9, ar: 8.73, od: 6.76, hp: 5.6})) {success = false}

	console.log("\nThis beatmap will get requested several times with different mods in order to see if its SR does not bug")
	for (const [key, value] of Object.entries(osu.Mods).splice(0, Object.entries(osu.Mods).length / 2)) {
		// The solution used in getBeatmap() is to simply remove the unsupported mod(s) from the request
		// So if we were to request a beatmap with such a mod here, we'd be requesting it with NM instead
		// I honestly just don't wanna make the same request in a row ~15 times :skull:
		if (unsupported_mods.includes(Number(key))) {
			console.log("The following mod will not be requested as it'd be pointless:", osu.getMods(Number(key)))
			continue
		}
		
		process.stdout.write(`Requesting SR of Beatmap with mod ${value}: `)
		let modded_beatmap = await api.getBeatmap(beatmap, Number(key))
		if (modded_beatmap instanceof osu.APIError) {
			console.error(`Got an APIError: ${modded_beatmap.message}`)
			return false
		}
		if (modded_beatmap.difficultyrating === 0) {
			console.error(`Beatmaps with the mod ${value} have a difficultyrating of 0!`)
			return false
		}
	}
	return success
}

/**
 * Check if getBeatmapScores works fine
 */
const testGetBeatmapScores: () => Promise<Boolean> = async (): Promise<Boolean> => {
	const score_amount = 132408001
	process.stdout.write("\nRequesting scores from a normal Beatmap: ")
	let scores = await api.getBeatmapScores(129891, osu.Gamemodes.OSU, {user_id: 124493}, osu.Mods.Hidden + osu.Mods.HardRock)
	if (scores instanceof osu.APIError) {
		console.error(`Got an APIError: ${scores.message}`)
		return false
	}
	if (scores[0].score < score_amount) {
		console.error(`The first score's amount is not what it should be!
		Expected: ${score_amount} or more
		Got: ${scores[0].score}`)
		return false
	}
	process.stdout.write("Requesting scores from a bad Beatmap: ")
	if (!(await api.getBeatmapScores(bad_id, osu.Gamemodes.OSU) instanceof osu.APIError)) {
		console.error("Expected an APIError upon requesting scores from a bad Beatmap")
		return false
	}
	return true
}

/**
 * Check if getUserScores works fine
 */
const testGetUserScores: () => Promise<Boolean> = async (): Promise<Boolean> => {
	const scores_limit = 10
	process.stdout.write("\nRequesting the best scores of a normal User: ")
	let scores = await api.getUserScores({user_id: 2}, osu.Gamemodes.OSU, "best", scores_limit)
	if (scores instanceof osu.APIError) {
		console.error(`Got an APIError: ${scores.message}`)
		return false
	}
	if (scores.length !== scores_limit) {
		console.error(`The array doesn't have a normal amount of scores!
		Expected: ${scores_limit}
		Got: ${scores.length}`)
		return false
	}
	process.stdout.write("Requesting the best scores from a bad User: ")
	if (!(await api.getUserScores({user_id: bad_id}, osu.Gamemodes.TAIKO, "best", scores_limit) instanceof osu.APIError)) {
		console.error("Expected an APIError upon requesting top scores from a bad User")
		return false
	}
	process.stdout.write("Requesting the recent scores from a normal User: ")
	await api.getUserScores({user_id: 2}, osu.Gamemodes.CTB, "recent", scores_limit)
	process.stdout.write("Requesting the recent scores from a bad User: ")
	if (!(await api.getUserScores({user_id: bad_id}, osu.Gamemodes.MANIA, "recent", scores_limit) instanceof osu.APIError)) {
		console.error("Expected an APIError upon requesting recent scores from a bad User")
		return false
	}
	return true
}

/**
 * Check if getReplay works fine
 */
const testGetReplay: () => Promise<Boolean> = async (): Promise<Boolean> => {
	const replay_id = 2177560145
	process.stdout.write("\nRequesting the Replay from a normal score: ")
	let replay = await api.getReplay(osu.Gamemodes.OSU, {score_id: replay_id})
	if (replay instanceof osu.APIError) {
		console.error(`Got an APIError: ${replay.message}`)
		return false
	}
	if (replay.content.length < 1000) {
		console.error(`The content of the replay is not what it should be!
		Expected: A string of length 1000 or more
		Got: ${replay.content.length}`)
		return false
	}
	process.stdout.write("Requesting the Replay from a bad score: ")
	if (!(await api.getReplay(osu.Gamemodes.TAIKO, {score_id: bad_id}) instanceof osu.APIError)) {
		console.error("Expected an APIError upon requesting a bad Replay")
		return false
	}
	return true
}

const test: () => Promise<void> = async () => {
	let u = await testGetUser()
	let m = await testGetMatch()
	let b = await testGetBeatmap()
	let mb = await testModdedBeatmap()
	let bs = await testGetBeatmapScores()
	let us = await testGetUserScores()
	let r = await testGetReplay()

	console.log("\n")
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
		console.error(`The beatmap's stats with the mods ${osu.getMods(mods)} are not what they should be!`)
		return false
	} else if (bm.difficultyrating <= 0) {
		console.error(`The beatmap's star rating with the mods ${osu.getMods(mods)} is 0* or below! (it's ${bm.difficultyrating})`)
		return false
	} else {
		console.log(osu.getMods(mods), "Beatmaps' stats are looking good!")
		return true
	}
}

test()
