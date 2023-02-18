import "dotenv/config"
import * as osu from "./index"

const key = process.env.KEY
if (key === undefined) {throw new Error("The API key has not been defined in the environment variables! (name of the variable is `KEY`)")}
const api = new osu.API(key, true)
const bad_id = -1

const test: () => Promise<void> = async () => {
	console.log("\nTesting: getUser()")
	const user_id = 7276846
	let u1 = await api.getUser({user_id}, 0)
	if (u1 instanceof osu.APIError) {
		throw new Error(`Got an APIError: ${u1.message}`)
	}
	if (u1.user_id !== user_id) {
		throw new Error(`The user's id is not what it should be!
		Expected: ${user_id}
		Got: ${u1.user_id}`)
	}
	await api.getUser({user_id: bad_id}, 3)
	await api.getUser({user_id: bad_id}, bad_id)

	console.log("\nTesting: getMatch()")
	const match_name = "IT: (tout le monde) vs (Adéquat feur)"
	let m1 = await api.getMatch(106369699)
	if (m1 instanceof osu.APIError) {
		throw new Error(`Got an APIError: ${m1.message}`)
	}
	if (m1.match.name !== match_name) {
		throw new Error(`The match's name is not what it should be!
		Expected: ${match_name}
		Got: ${m1.match.name}`)
	}
	await api.getMatch(bad_id)

	console.log("\nTesting: getBeatmap()")
	const song_name = "FriendZoned"
	let b1 = await api.getBeatmap(m1.games[1].beatmap_id, 0)
	if (b1 instanceof osu.APIError) {
		throw new Error(`Got an APIError: ${b1.message}`)
	}
	if (b1.title !== song_name) {
		throw new Error(`The beatmap's song name is not what it should be!
		Expected: ${song_name}
		Got: ${b1.title}`)
	}
	await api.getBeatmap(bad_id, 3)
	await api.getBeatmap(bad_id, bad_id)

	// TODO: Check beatmap stats when mods are active

	console.log("\nLooks like the test went well!")
}

test()
