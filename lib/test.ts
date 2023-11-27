import "dotenv/config"
import util from "util"
import * as osu from "./index.js"
import { unsupported_mods } from "./mods.js"

import tsj from "ts-json-schema-generator"
import ajv from "ajv"

const key = process.env.KEY
if (key === undefined) {throw new Error("❌ The API key has not been defined in the environment variables! (name of the variable is `KEY`)")}
const api = new osu.API(key, "all")

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

const checkBeatmapWithMods = (b: osu.Beatmap, mods: osu.Mods, expected: object) => {
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

// ---------

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

function isOk(response: any, condition?: boolean, depth: number = Infinity) {
	if (condition === undefined) condition = true
	if (!response || !condition) {
		if (Array.isArray(response) && response[0]) {
			console.log("(only printing the first element of the response array for the error below)")
			response = response[0]
		}
		console.error("❌ Bad response:", util.inspect(response, {colors: true, compact: true, breakLength: 400, depth: depth}))
		return false
	}
	return true
}

// ajv will not work properly if type is not changed from string to object where format is date-time
function fixDate(x: any) {
	if (typeof x === "object" && x !== null) {
		if (x["format"] && x["format"] === "date-time" && x["type"] && x["type"] === "string") {
			x["type"] = "object"
		}

		const k = Object.keys(x)
		const v = Object.values(x)
		for (let i = 0; i < k.length; i++) {
			x[k[i]] = fixDate(v[i])
		}
	}

	return x
}

// Creating a Generator takes 3 to 5 seconds, so it's better not to create one each time we call the validate function
function validate(object: unknown, schemaName: string, generator: tsj.SchemaGenerator): boolean {
	try {
		const schema = fixDate(generator.createSchema(schemaName))
		const ajv_const = new ajv.default({strict: false})
		ajv_const.addFormat("date-time", true)
		let validator = ajv_const.compile(schema)

		if (Array.isArray(object)) {
			for (let i = 0; i < object.length; i++) {
				let result = validator(object[i])
				if (validator.errors) console.error(validator.errors)
				if (!result) return false
			}
			return true
		} else {
			let result = validator(object)
			if (validator.errors) console.error(validator.errors)
			return result
		}
	} catch(err) {
		console.log(err)
		return true
	}
}

// ---------

const testRequests = async(): Promise<boolean> => {
	let okay = true

	const user_gen = tsj.createGenerator({path: "lib/user.ts", additionalProperties: true})
	const user_id = 7276846
	const user = await <Promise<ReturnType<typeof api.getUser> | false>>attempt("\ngetUser: ", api.getUser(osu.Gamemodes.OSU, {user_id}))
	if (!isOk(user, !user || (user.user_id === user_id && validate(user, "User", user_gen)))) okay = false

	const beatmap_gen = tsj.createGenerator({path: "lib/beatmap.ts", additionalProperties: true})
	const beatmap_info = {id: 892780, name: "FriendZoned"}
	const beatmap = await <Promise<ReturnType<typeof api.getBeatmap> | false>>attempt("getBeatmap: ", api.getBeatmap({beatmap_id: beatmap_info.id}))
	if (!isOk(beatmap, !beatmap || (beatmap.title === beatmap_info.name && validate(beatmap, "Beatmap", beatmap_gen)))) okay = false

	const match_gen = tsj.createGenerator({path: "lib/match.ts", additionalProperties: true})
	const match_info = {id: 106369699, name: "IT: (tout le monde) vs (Adéquat feur)"}
	const match = await <Promise<ReturnType<typeof api.getMatch> | false>>attempt("getMatch: ", api.getMatch(match_info.id))
	if (!isOk(match, !match || (match.match.name === match_info.name && validate(match, "Match", match_gen)))) okay = false


	const score_gen = tsj.createGenerator({path: "lib/score.ts", additionalProperties: true})

	const beatmap_scores = await <Promise<ReturnType<typeof api.getBeatmapScores> | false>>attempt(
		"getBeatmapScores: ", api.getBeatmapScores(5, osu.Gamemodes.OSU, {beatmap_id: 129891}, {user_id: 124493}, osu.Mods.HIDDEN + osu.Mods.HARDROCK))
	if (!isOk(beatmap_scores, !beatmap_scores || (beatmap_scores[0].score >= 132408001 && validate(beatmap_scores, "Score", score_gen)))) okay = false

	const user_best_scores = await <Promise<ReturnType<typeof api.getUserBestScores> | false>>attempt(
		"getUserBestScores: ", api.getUserBestScores(90, osu.Gamemodes.OSU, {user_id: 2})
	)
	if (!isOk(user_best_scores, !user_best_scores || (user_best_scores.length <= 90 && validate(user_best_scores, "Score", score_gen)))) okay = false
	const user_recent_scores = await <Promise<ReturnType<typeof api.getUserRecentScores> | false>>attempt(
		"getUserRecentScores: ", api.getUserRecentScores(10, osu.Gamemodes.CTB, {user_id: 8172283})
	)
	if (!isOk(user_recent_scores, !user_recent_scores || (user_recent_scores.length <= 10 && validate(user_recent_scores, "Score", score_gen)))) okay = false

	const replay_gen = tsj.createGenerator({path: "lib/replay.ts", additionalProperties: true})
	const replay = await <Promise<ReturnType<typeof api.getReplay> | false>>attempt(
		"getReplay: ", api.getReplay(osu.Gamemodes.OSU, {score: {score_id: 2177560145}})
	)
	if (!isOk(replay, !replay || (replay.content.length > 1000 && validate(replay, "Replay", replay_gen)))) okay = false

	return okay
}

const testAdjustBeatmapStatsToMods = async (): Promise<boolean> => {
	let success = true
	let beatmap = await <Promise<ReturnType<typeof api.getBeatmap> | false>>attempt(
		"\nRequesting another normal Beatmap once in order to change its stats with mods: ", api.getBeatmap({beatmap_id: 2592029}, osu.Mods.NOFAIL)
	)
	if (!beatmap) {return false}
	
	// Expected AR is specified on: https://osu.ppy.sh/wiki/en/Beatmap/Approach_rate#table-comparison
	// Expected OD is specified on: https://osu.ppy.sh/wiki/en/Beatmap/Overall_difficulty#osu!
	const dtnc = [osu.Mods.DOUBLETIME, osu.Mods.NIGHTCORE]
	for (let i=0;i<dtnc.length;i++) {if (!checkBeatmapWithMods(beatmap, dtnc[i], {bpm: 294, cs: 3, ar: 9, od: 8.44, hp: 4})) {success=false}}
	if (!checkBeatmapWithMods(beatmap, osu.Mods.HALFTIME, {bpm: 147, cs: 3, ar: 5, od: 3.56, hp: 4})) {success = false}
	if (!checkBeatmapWithMods(beatmap, osu.Mods.EASY, {bpm: 196, cs: 1.5, ar: 3.5, od: 3, hp: 2})) {success = false}
	if (!checkBeatmapWithMods(beatmap, osu.Mods.HARDROCK, {bpm: 196, cs: 3.9, ar: 9.8, od: 8.4, hp: 5.6})) {success = false}
	for (let i=0;i<dtnc.length;i++) {if (!checkBeatmapWithMods(beatmap, dtnc[i] + osu.Mods.EASY, {bpm: 294, cs: 1.5, ar: 6.87, od: 6.44, hp: 2})) {success=false}}
	for (let i=0;i<dtnc.length;i++) {if (!checkBeatmapWithMods(beatmap, dtnc[i] + osu.Mods.HARDROCK, {bpm: 294, cs: 3.9, ar: 10.87, od: 10.04, hp: 5.6})) {success=false}}
	if (!checkBeatmapWithMods(beatmap, osu.Mods.HALFTIME + osu.Mods.EASY, {bpm: 147, cs: 1.5, ar: -0.33, od: -0.44, hp: 2})) {success = false}
	if (!checkBeatmapWithMods(beatmap, osu.Mods.HALFTIME + osu.Mods.HARDROCK, {bpm: 147, cs: 3.9, ar: 8.73, od: 6.76, hp: 5.6})) {success = false}

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

const test = async (): Promise<void> => {
	const requests = await testRequests()
	const adjustments = await testAdjustBeatmapStatsToMods()

	const arr = [requests, adjustments]

	let test_results = arr.map((bool: boolean, index: number) => bool ? `${index + 1}: ✔️\n` : `${index + 1}: ❌\n`)
	console.log("\n", ...test_results)
	if (arr.indexOf(false) === -1) {
		console.log("✔️ Looks like the test went well!")
	} else {
		throw new Error("❌ Something in the test went wrong...")
	}
}

test()
