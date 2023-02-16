import "dotenv/config"
import * as osu from "./index"

const key = process.env.KEY
if (key === undefined) {throw new Error("The API key has not been defined in the environment variables! (name of the variable is `KEY`)")}
const api = new osu.API(key, true)

const test: () => Promise<void> = async () => {
	let match: osu.Match = await api.getMatch(103845156)
	console.log("Name of the match:", match.match.name, "\n")

	const game = match.games[1]
	const score = game.scores.find((s) => s.user_id === 7276846)!

	let beatmap: osu.Beatmap = await api.getBeatmap(game.beatmap_id, osu.Mods["DoubleTime"])
	console.log("First map outside warmups was:", `${beatmap.artist} - ${beatmap.title} [${beatmap.version}],`, `a ${beatmap.getGenre()} song\n`)

	let user: osu.User = await api.getUser({user_id: score.user_id}, 0)
	console.log(`${user.username}, who is currently ranked #${user.pp_rank} on osu!, got a score of ${score.score} on it!\n`)

	let scores: osu.Score[] = await api.getUserScores(user, 0, "best", 3)
	console.log("This user's top 3 scores are worth in pp respectively:")
	scores.forEach((s) => console.log(s.pp))

	console.log("\nLooks like the test went well!")
}

test()
