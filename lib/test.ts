import * as osu from "./index.js"
import "dotenv/config"
import util from "util"

import tsj from "ts-json-schema-generator"
import ajv from "ajv"
import { expect } from "chai"

// ------

const key = process.env.KEY
if (key === undefined) {throw new Error("❌ The API key has not been defined in the environment variables! (name of the variable is `KEY`)")}
const api = new osu.API(key, "all")
const generator = tsj.createGenerator({path: "lib/index.ts", additionalProperties: true})

// ------

function roundTo(n: number, digits: number) {
	let negative = false
	if (n < 0) {
		negative = true
		n *= -1
	}
	const multiplicator = Math.pow(10, digits)
	n = parseFloat((n * multiplicator).toFixed(11))
	let x = (Math.round(n) / multiplicator).toFixed(digits)
	if (negative) {x = (Number(x) * -1).toFixed(digits)}
	return Number(x)
}

const checkBeatmapWithMods = (b: osu.Beatmap, mods: osu.Mods[], expected: object) => {
	const bm = osu.Mods.adjustBeatmapStats(b, mods)
	const stats = {
		bpm: roundTo(bm.bpm, 2),
		cs: roundTo(bm.diff_size, 2),
		ar: roundTo(bm.diff_approach, 2),
		od: roundTo(bm.diff_overall, 2),
		hp: roundTo(bm.diff_drain, 2)
	}
	if (JSON.stringify(stats) !== JSON.stringify(expected)) {
		console.log("Expected", expected, "but got", stats)
		console.error(`❌ The beatmap's stats with the mods ${mods.map((m) => osu.Mods[m])} are not what they should be!\n`)
		return false
	} else if (bm.difficultyrating <= 0) {
		console.error(`❌ The beatmap's star rating with the mods ${mods.map((m) => osu.Mods[m])} is 0* or below! (it's ${bm.difficultyrating})`)
		return false
	}
	return true
}

// ---------

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

/**
 * @param obj The thing to check the interface of
 * @param schemaName The name of the interface the object is supposed to correspond to
 */
function validate(obj: unknown, schemaName: string): boolean {
	try {
		const schema = fixDate(generator.createSchema(schemaName))
		const ajv_const = new ajv.default({strict: false})
		ajv_const.addFormat("date-time", true)
		const validator = ajv_const.compile(schema)

		if (Array.isArray(obj)) {
			for (let i = 0; i < obj.length; i++) {
				const result = validator(obj[i])
				if (validator.errors) console.error(obj[i], util.inspect(validator.errors, {colors: true, depth: 5}))
				if (!result) return false
			}
			return true
		} else {
			const result = validator(obj)
			if (validator.errors) console.error(obj, util.inspect(validator.errors, {colors: true, depth: 5}))
			return result
		}
	} catch(err) {
		console.log(err)
		return false
	}
}

// ---------

const getUser = async(): Promise<boolean> => {
	try {
		const user = await api.getUser(osu.Gamemodes.OSU, {user_id: 2})
		expect(user.user_id).to.equal(2)
		expect(validate(user, "User")).to.be.true
		return true
	} catch(e) {
		console.error(e)
		return false
	}
}

const getUserRecentScores = async(): Promise<boolean> => {
	try {
		const scores = await api.getUserRecentScores(2, osu.Gamemodes.OSU, {user_id: 5795337})
		expect(scores).to.have.lengthOf(2)
		scores.forEach(s => expect(s.user_id).to.equal(5795337))
		expect(validate(scores, "ScoreWithBeatmapid")).to.be.true
		return true
	} catch(e) {
		console.error(e)
		return false
	}
}

const getUserBestScores = async(): Promise<boolean> => {
	try {
		const scores = await api.getUserBestScores(2, osu.Gamemodes.OSU, {user_id: 2})
		expect(scores).to.have.lengthOf(2)
		scores.forEach(s => expect(s.user_id).to.equal(2))
		expect(validate(scores, "ScoreWithBeatmapidReplayavailablePp")).to.be.true
		return true
	} catch(e) {
		console.error(e)
		return false
	}
}

const getBeatmap = async(): Promise<boolean> => {
	try {
		const beatmap = await api.getBeatmap({beatmap_id: 399386})
		expect(beatmap.beatmap_id).to.equal(399386)
		expect(beatmap.beatmapset_id).to.equal(164000)
		expect(beatmap.approved).to.equal(osu.Categories.GRAVEYARD)
		expect(beatmap.title).to.equal("")
		expect(validate(beatmap, "Beatmap")).to.be.true
		return true
	} catch(e) {
		console.error(e)
		return false
	}
}

const getBeatmaps = async(): Promise<boolean> => {
	try {
		const beatmaps = await api.getBeatmaps(75, {gamemode: "all"})
		expect(beatmaps).to.have.lengthOf(75)
		expect(validate(beatmaps, "Beatmap")).to.be.true
		return true
	} catch(e) {
		console.error(e)
		return false
	}
}

const getBeatmapScores = async(): Promise<boolean> => {
	try {
		const scores = await api.getBeatmapScores(5, osu.Gamemodes.OSU, {beatmap_id: 129891}, {user_id: 124493}, [osu.Mods.HIDDEN, osu.Mods.HARDROCK])
		expect(scores).to.have.lengthOf(1) // only 1 score per user per beatmap... or per beatmap per user? man idk
		expect(scores[0].user_id).to.equal(124493)
		expect(validate(scores, "ScoreWithReplayavailablePp")).to.be.true
		return true
	} catch(e) {
		console.error(e)
		return false
	}
}

const getMatch = async(): Promise<boolean> => {
	try {
		const match = await api.getMatch(106369699)
		expect(match.match.match_id).to.equal(106369699)
		expect(match.match.name).to.equal("IT: (tout le monde) vs (Adéquat feur)")
		expect(match.games.filter((g) => g.end_time)).to.have.lengthOf(28)
		expect(validate(match, "Match")).to.be.true
		return true
	} catch(e) {
		console.error(e)
		return false
	}
}

const getReplay = async(): Promise<boolean> => {
	try {
		const replay = await api.getReplay(osu.Gamemodes.OSU, {score_id: 2177560145})
		expect(replay.content).to.have.lengthOf(159224)
		expect(validate(replay, "Replay")).to.be.true
		return true
	} catch(e) {
		console.error(e)
		return false
	}
}

const testBeatmapWithMods = async (): Promise<boolean> => {
	console.log("\n Now testing the behaviour of Mods.adjustBeatmapStats & getBeatmap() with mods...")
	try {
		const beatmap = await api.getBeatmap({beatmap_id: 2592029}, [osu.Mods.NOFAIL])
		// Expected AR is specified on: https://osu.ppy.sh/wiki/en/Beatmap/Approach_rate#table-comparison
		// Expected OD is specified on: https://osu.ppy.sh/wiki/en/Beatmap/Overall_difficulty#osu!

		const dtnc = [osu.Mods.DOUBLETIME, osu.Mods.NIGHTCORE]
		for (let i = 0; i < dtnc.length; i++) {
			expect(checkBeatmapWithMods(beatmap, [dtnc[i]], {bpm: 294, cs: 3, ar: 9, od: 8.44, hp: 4})).to.be.true
			expect(checkBeatmapWithMods(beatmap, [dtnc[i], osu.Mods.EASY], {bpm: 294, cs: 1.5, ar: 6.87, od: 6.44, hp: 2})).to.be.true
			expect(checkBeatmapWithMods(beatmap, [dtnc[i], osu.Mods.HARDROCK], {bpm: 294, cs: 3.9, ar: 10.87, od: 10.04, hp: 5.6})).to.be.true
		}

		expect(checkBeatmapWithMods(beatmap, [osu.Mods.HALFTIME], {bpm: 147, cs: 3, ar: 5, od: 3.56, hp: 4})).to.be.true
		expect(checkBeatmapWithMods(beatmap, [osu.Mods.EASY], {bpm: 196, cs: 1.5, ar: 3.5, od: 3, hp: 2})).to.be.true
		expect(checkBeatmapWithMods(beatmap, [osu.Mods.HARDROCK], {bpm: 196, cs: 3.9, ar: 9.8, od: 8.4, hp: 5.6})).to.be.true
		expect(checkBeatmapWithMods(beatmap, [osu.Mods.HALFTIME, osu.Mods.EASY], {bpm: 147, cs: 1.5, ar: -0.33, od: -0.44, hp: 2})).to.be.true
		expect(checkBeatmapWithMods(beatmap, [osu.Mods.HALFTIME, osu.Mods.HARDROCK], {bpm: 147, cs: 3.9, ar: 8.73, od: 6.76, hp: 5.6})).to.be.true

		const mods: osu.Mods[] = Object.entries(osu.Mods)
			.filter(([_key, value]) => typeof value === "string")
			.map(([key, _value]) => Number(key))

		for (let i = 0; i < mods.length; i++) {
			const mod = mods[i]
			const modded_beatmap = await api.getBeatmap(beatmap, [mod])
			expect(modded_beatmap.difficultyrating).to.not.be.lessThanOrEqual(0)
		}

		return true
	} catch(e) {
		console.error(e)
		return false
	}
}

const test = async (): Promise<void> => {
	const tests = [
		getUser,
		getUserRecentScores,
		getUserBestScores,
		getBeatmap,
		getBeatmaps,
		getBeatmapScores,
		getMatch,
		getReplay,
		testBeatmapWithMods,
	]

	const results: {test_name: string, passed: boolean}[] = []
	for (let i = 0; i < tests.length; i++) {
		results.push({test_name: tests[i].name, passed: await tests[i]()})
	}
	console.log("\n", ...results.map((r) => `${r.test_name}: ${r.passed ? "✔️" : "❌"}\n`))

	if (!results.find((r) => !r.passed)) {
		console.log("✔️ Looks like the test went well!")
	} else {
		throw new Error("❌ Something in the test went wrong...")
	}
}

test()
