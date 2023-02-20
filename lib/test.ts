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

const test: () => Promise<void> = async () => {
	// Check if getUser() works fine
	const user_id = 7276846
	process.stdout.write("\nRequesting a normal User: ")
	let u1 = await api.getUser({user_id}, 0)
	if (u1 instanceof osu.APIError) {
		throw new Error(`Got an APIError: ${u1.message}`)
	}
	if (u1.user_id !== user_id) {
		throw new Error(`The user's id is not what it should be!
		Expected: ${user_id}
		Got: ${u1.user_id}`)
	}
	process.stdout.write("Requesting a bad User: ")
	await api.getUser({user_id: bad_id}, 3)

	// Check if getMatch() works fine
	const match_name = "IT: (tout le monde) vs (Adéquat feur)"
	process.stdout.write("\nRequesting a normal Match: ")
	let m1 = await api.getMatch(106369699)
	if (m1 instanceof osu.APIError) {
		throw new Error(`Got an APIError: ${m1.message}`)
	}
	if (m1.match.name !== match_name) {
		throw new Error(`The match's name is not what it should be!
		Expected: ${match_name}
		Got: ${m1.match.name}`)
	}
	process.stdout.write("Requesting a bad Match: ")
	await api.getMatch(bad_id)

	// Check if getBeatmap() works fine
	const song_name = "FriendZoned"

	process.stdout.write("\nRequesting a normal Beatmap: ")
	let b1 = await api.getBeatmap(m1.games[1].beatmap_id, 0)
	if (b1 instanceof osu.APIError) {
		throw new Error(`Got an APIError: ${b1.message}`)
	}
	if (b1.title !== song_name) {
		throw new Error(`The beatmap's song name is not what it should be!
		Expected: ${song_name}
		Got: ${b1.title}`)
	}
	process.stdout.write("Requesting a bad Beatmap: ")
	await api.getBeatmap(bad_id, 0)

	process.stdout.write("\nRequesting another normal Beatmap once in order to change its stats with mods: ")
	let b2 = await api.getBeatmap(2592029, osu.Mods.NoFail)
	if (b2 instanceof osu.APIError) {throw new Error(`Got an APIError: ${b2.message}`)}
	// Expected AR is specified on: https://osu.ppy.sh/wiki/en/Beatmap/Approach_rate#table-comparison
	// Expected OD is specified on: https://osu.ppy.sh/wiki/en/Beatmap/Overall_difficulty#osu!
	testBeatmapWithMods(b2, osu.Mods.DoubleTime, {bpm: 294, cs: 3, ar: 9, od: 8.44, hp: 4})
	testBeatmapWithMods(b2, osu.Mods.HalfTime, {bpm: 147, cs: 3, ar: 5, od: 3.56, hp: 4})
	testBeatmapWithMods(b2, osu.Mods.Easy, {bpm: 196, cs: 1.5, ar: 3.5, od: 3, hp: 2})
	testBeatmapWithMods(b2, osu.Mods.HardRock, {bpm: 196, cs: 3.9, ar: 9.8, od: 8.4, hp: 5.6})
	testBeatmapWithMods(b2, osu.Mods.DoubleTime + osu.Mods.Easy, {bpm: 294, cs: 1.5, ar: 6.87, od: 6.44, hp: 2})
	testBeatmapWithMods(b2, osu.Mods.DoubleTime + osu.Mods.HardRock, {bpm: 294, cs: 3.9, ar: 10.87, od: 10.04, hp: 5.6})
	testBeatmapWithMods(b2, osu.Mods.HalfTime + osu.Mods.Easy, {bpm: 147, cs: 1.5, ar: -0.33, od: -0.44, hp: 2})
	testBeatmapWithMods(b2, osu.Mods.HalfTime + osu.Mods.HardRock, {bpm: 147, cs: 3.9, ar: 8.73, od: 6.76, hp: 5.6})

	console.log("\nThis beatmap will get requested several times with different mods in order to see if its SR does not bug")
	for (const [key, value] of Object.entries(osu.Mods).splice(0, Object.entries(osu.Mods).length / 2)) {
		// The solution used in getBeatmap() is to simply remove the unsupported mod(s) from the request
		// So if we were to request a beatmap with such a mod here, we'd be requesting it with NM instead
		// I honestly just don't wanna make the same request in a row ~15 times :skull:
		if (unsupported_mods.includes(Number(key))) {
			console.log("The following mod will not be requested as it'd be pointless:", osu.getMods(Number(key), "long"))
			continue
		}
		
		process.stdout.write(`Requesting SR of Beatmap with mod ${value}: `)
		let b3 = await api.getBeatmap(2592029, Number(key))
		if (b3 instanceof osu.APIError) {throw new Error(`Got an APIError: ${b3.message}`)}
		if (b3.difficultyrating === 0) {
			throw new Error(`Beatmaps with the mod ${value} have a difficultyrating of 0!`)
		}
	}

	console.log("\nLooks like the test went well!")
}

const testBeatmapWithMods = (b: osu.Beatmap, mods: osu.Mods, expected: object) => {
	let bm = osu.adjustBeatmapStatsToMods(Object.assign({}, b), mods)
	let stats = {
		bpm: roundTo(bm.bpm, 2),
		cs: roundTo(bm.diff_size, 2),
		ar: roundTo(bm.diff_approach, 2),
		od: roundTo(bm.diff_overall, 2),
		hp: roundTo(bm.diff_drain, 2)
	}
	if (JSON.stringify(stats) !== JSON.stringify(expected)) {
		console.log("Expected", expected, "but got", stats)
		throw new Error(`The beatmap's stats with the mods ${osu.getMods(mods, "long")} are not what they should be!`)
	} else {
		console.log(osu.getMods(mods, "long"), "Beatmaps' stats are looking good!")
	}
}

test()
