import { User } from "./user.js"
import { Score, ScoreWithBeatmapid, ScoreWithBeatmapidReplayavailablePp, ScoreWithReplayavailablePp } from "./score.js"
import { Beatmap, Categories, Genres, Languages } from "./beatmap.js"
import { Match, MultiplayerModes, WinConditions } from "./match.js"
import { Mods } from "./mods.js"
import { Replay } from "./replay.js"
import { Gamemodes, getLength, getURL } from "./misc.js"

export {Gamemodes, User, Score, ScoreWithBeatmapid, ScoreWithBeatmapidReplayavailablePp, ScoreWithReplayavailablePp, Mods, Replay}
export {Beatmap, Categories, Genres, Languages}
export {Match, MultiplayerModes, WinConditions}
export {getLength, getURL}

/**
 * *Almost* **everything** in the JSONs the API returns is a string, this function fixes that
 * @param x Anything, but should be a string, an array that contains a string, or an object which has a string
 * @returns x, but with it (or what it contains) now having the correct type
 */
function correctType(x: any): any {
	/**
	 * This package transforms some properties into Booleans when fitting
	 */
	const bools = [
		"replay_available", // Score
		"pass", // Match.games
		"perfect", // Score, Match.games
		"storyboard", "video", "download_unavailable", "audio_unavailable" // Beatmap
	]

	if (typeof x === "boolean") {
		return x
	} else if (/^[+-[0-9][0-9]+-[0-9]{2}-[0-9]{2}($|[ T].*)/.test(x)) {
		if (/[0-9]{2}:[0-9]{2}:[0-9]{2}$/.test(x)) x += "Z"
		if (/[0-9]{2}:[0-9]{2}:[0-9]{2}\+[0-9]{2}:[0-9]{2}$/.test(x)) x = x.substring(0, x.indexOf("+")) + "Z"
		return new Date(x)
	} else if (Array.isArray(x)) {
		return x.map((e) => correctType(e))
	} else if (!isNaN(x) && x !== "" && !(x instanceof Date)) {
		return x === null ? null : Number(x)
	} else if (typeof x === "object" && x !== null) {
		const k = Object.keys(x)
		const v = Object.values(x)
		for (let i = 0; i < k.length; i++) {
			x[k[i]] = bools.includes(k[i]) ? Boolean(Number(v[i])) : correctType(v[i])
		}
	}
	return x
}

/**
 * If the `API` throws an error, it should always be an `APIError`!
 */
export class APIError {
	message: string
	server: string
	endpoint: string
	parameters: string
	/**
	 * @param message The reason why things didn't go as expected
	 * @param server The server to which the request was sent
	 * @param endpoint The type of resource that was requested from the server
	 * @param parameters The filters that were used to specify what resource was wanted
	 */
	constructor(message: string, server: string, endpoint: string, parameters: string) {
		this.message = message
		this.server = server
		this.endpoint = endpoint
		this.parameters = parameters
	}
}

/**
 * Create an object of this class to get started!
 */
export class API {
	key: string
	verbose: "none" | "errors" | "all"
	server: string
	/**
	 * @param key Your API key, which you can get at https://osu.ppy.sh/p/api
	 * @param verbose (default `none`) Which events should be logged
	 * @param server (default `https://osu.ppy.sh/api/`) The server where the requests should be sent to
	 */
	constructor(key: string, verbose: "none" | "errors" | "all" = "none", server: string = "https://osu.ppy.sh/api/") {
		this.key = key
		this.verbose = verbose
		this.server = server
	}

	/**
	 * Use this instead of `console.log` to log any information
	 * @param is_error Is the information an error?
	 * @param to_log Whatever you would put between the parentheses of `console.log()`
	 */
	private log(is_error: boolean, ...to_log: any[]) {
		if (this.verbose === "all" || (this.verbose === "errors" && is_error === true)) {
			console.log("osu!api v1 ->", ...to_log)
		}
	}

	/**
	 * @param endpoint Basically the endpoint, what comes in the URL after `api/`
	 * @param parameters The things to specify in the request, such as the beatmap_id when looking for a beatmap
	 * @param number_try How many attempts there's been to get the data
	 * @returns A Promise with the API's response
	 */
	private async request(endpoint: string, parameters: string, number_try: number = 1): Promise<any> {
		const max_tries = 5
		let err = "none"
		let to_retry = false

		const response = await fetch(`${this.server}/${endpoint}?k=${this.key}&${parameters}`, {
			method: "get",
			headers: {
				"Accept": "application/json",
				"Accept-Encoding": "gzip",
				"Content-Type": "application/json",
				"User-Agent": "osu-api-v1-js (https://github.com/TTTaevas/osu-api-v1-js)"
			}
		})
		.catch((error) => {
			this.log(true, error?.message)
			err = `${error?.name} (${error?.errno})`
		})

		if (!response || !response.ok) {
			if (response) {
				err = response.statusText
				if (response.status === 401) {
					this.log(true, "Server responded with status code 401, are you sure you're using a valid API key?")
				} else if (response.status === 429) {
					this.log(true, "Server responded with status code 429, you're sending too many requests at once and are getting rate-limited!")
					to_retry = true
				} else {
					this.log(true, "Server responded with status:", response.status)
				}
			}

			if (to_retry === true && number_try < max_tries) {
				this.log(true, "Will request again in a few instants...", `(Try #${number_try})`)
				let to_wait = (Math.floor(Math.random() * (500 - 100 + 1)) + 100) * 10
				await new Promise(res => setTimeout(res, to_wait))
				return await this.request(endpoint, parameters, number_try + 1)
			}

			throw new APIError(err, this.server, endpoint, parameters)
		}

		this.log(false, response.statusText, response.status, {endpoint, parameters})
		let json = await response.json()
		if (Array.isArray(json) && !json.length) {
			throw new APIError("No results", this.server, endpoint, parameters)
		} else if (typeof json === "object" && json) {
			if ("error" in json) {
				let err = typeof json.error === "string" ? json.error : "A strange error was returned by the server..."
				throw new APIError(err, this.server, endpoint, parameters)
			}
			if ("match" in json && json.match === 0) {
				throw new APIError("Match not available.", this.server, endpoint, parameters)
			}
		}
		return correctType(json)
	}

	/**
	 * @param gamemode The `User`'s `Gamemode`
	 * @param user An Object with either a `user_id` or a `username` (ignores `username` if `user_id` is specified)
	 * @returns A Promise with a `User` found with the search
	 */
	async getUser(gamemode: Gamemodes, user: {user_id?: User["user_id"], username?: User["username"]} | User): Promise<User> {
		const lookup = user.user_id !== undefined ? `u=${user.user_id}&type=id` : `u=${user.username}&type=string`
		const response = await this.request("get_user", `m=${gamemode}&${lookup}`) as User[]
		return response[0]
	}

	/**
	 * @param limit The maximum number of Scores to get, **cannot exceed 100**
	 * @param gamemode The `User`'s `Gamemode`
	 * @param user An Object with either a `user_id` or a `username` (`user_id` is preferred)
	 * @returns A Promise with an array of `Scores` set by the `User` within the last 24 hours in a specific `Gamemode`
	 */
	async getUserBestScores(limit: number, gamemode: Gamemodes, user: {user_id?: User["user_id"], username?: User["username"]} | User):
	Promise<ScoreWithBeatmapidReplayavailablePp[]> {
		const lookup = user.user_id !== undefined ? `u=${user.user_id}&type=id` : `u=${user.username}&type=string`
		const scores = await this.request("get_user_best", `${lookup}&m=${gamemode}&limit=${limit}`)
		scores.forEach((s: any) => s.enabled_mods = Mods.bitsToArray(s.enabled_mods))
		return scores
	}

	/**
	 * @param limit The maximum number of Scores to get, **cannot exceed 100**
	 * @param gamemode The `User`'s `Gamemode`
	 * @param user An Object with either a `user_id` or a `username` (`user_id` is preferred)
	 * @returns A Promise with an array of `Scores` set by the `User` within the last 24 hours in a specific `Gamemode`
	 */
	async getUserRecentScores(limit: number, gamemode: Gamemodes, user: {user_id?: User["user_id"], username?: User["username"]} | User): Promise<ScoreWithBeatmapid[]> {
		const lookup = user.user_id !== undefined ? `u=${user.user_id}&type=id` : `u=${user.username}&type=string`
		const scores = await this.request("get_user_recent", `${lookup}&m=${gamemode}&limit=${limit}`)
		scores.forEach((s: any) => s.enabled_mods = Mods.bitsToArray(s.enabled_mods))
		return scores
	}

	/**
	 * Look for and get a singular `Beatmap` with this!
	 * @param beatmap An Object with the ID of the difficulty/`Beatmap` of the beatmapset
	 * @param mods An array of `Mods` to apply, defaults to an empty array
	 * @param gamemode The gamemode the beatmap is in (useful if you wanna convert, for example, an osu! map to taiko)
	 * @returns A Promise with a `Beatmap`
	 */
	async getBeatmap(beatmap: {beatmap_id: Beatmap["beatmap_id"]} | Beatmap, mods: Mods[] = [], gamemode?: Gamemodes): Promise<Beatmap> {
		mods = Mods.removeUnsupported(mods)
		const mods_bits = Mods.arrayToBits(mods)

		let details = gamemode !== undefined ? `&mode=${gamemode}&a=1` : ""
		details += mods_bits !== null ? `&mods=${mods_bits}` : ""
		const response = await this.request("get_beatmaps", `b=${beatmap.beatmap_id}${details}`) as Beatmap[]
		return Mods.adjustBeatmapStats(response[0], mods)
	}

	/**
	 * Look for and get `Beatmap`s with this! Throws an `APIError` if the array would be empty
	 * @param limit The maximum number of `Beatmap`s there should be in the array, **cannot exceed 500**
	 * @param gamemode Filter in the beatmaps by the gamemode (unless "all"), but if `allow_converts` then instead convert if possible the beatmaps to that gamemode
	 * @param beatmap Will look for its `beatmapset_id` (if undefined, its `beatmap_id` (if undefined, its `file_md5`))
	 * @param mods An array of `Mods` to apply, defaults to an empty array
	 * @param set_owner The `User` that owns the beatmapset
	 * @param since Filters out any `Beatmap` of `Category < 0`, and any `Beatmap` with an `approved_date` older than what's given
	 */
	async getBeatmaps(
	limit: number, gamemode: {gamemode: Gamemodes | "all", allow_converts?: boolean},
	beatmap?: {beatmapset_id?: Beatmap["beatmapset_id"], beatmap_id?: Beatmap["beatmap_id"], file_md5?: Beatmap["file_md5"]} | Beatmap,
	mods: Mods[] = [],
	set_owner?: {user_id?: number, username?: string} | User,
	since?: Date
	): Promise<Beatmap[]> {
		mods = Mods.removeUnsupported(mods)
		const mods_bits = Mods.arrayToBits(mods)

		const mode = gamemode.gamemode == "all" ? "" : `&m=${gamemode.gamemode}`
		const convert = gamemode.allow_converts ? "a=1" : "a=0"
		let lookup = mods_bits !== null ? `mods=${mods_bits}` : ""

		if (beatmap) {
			if (beatmap.beatmapset_id !== undefined) {
				lookup += `&s=${beatmap.beatmapset_id}`
			} else if (beatmap.beatmap_id !== undefined) {
				lookup += `&b=${beatmap.beatmap_id}`
			} else if (beatmap.file_md5 !== undefined) {
				lookup += `&h=${beatmap.file_md5}`
			}
		}

		if (set_owner) {
			if (set_owner.user_id !== undefined) {
				lookup += `&u=${set_owner.user_id}&type=id`
			} else if (set_owner.username !== undefined) {
				lookup += `&u=${set_owner.username}&type=string`
			}
		}

		if (since) {
			let x = since.toISOString().replace("T", " ")
			lookup += x.substring(0, x.indexOf("Z") - 4)
		}

		const response = await this.request("get_beatmaps", `limit=${limit}${mode}&${convert}${lookup}`) as Beatmap[]
		return response.map((b) => Mods.adjustBeatmapStats(correctType(b), mods))
	}

	/**
	 * @param limit The maximum number of `Scores` to get, **cannot exceed 100**
	 * @param gamemode A number representing the `Scores`' `Gamemode`
	 * @param beatmap An Object with the ID of the difficulty/`Beatmap` of the beatmapset
	 * @param user The `Scores`' user, which is an Object with either a `user_id` or a `username`
	 * @param mods An array of `Mods` to apply, defaults to an empty array
	 * @returns A Promise with an array of `Scores` set on a beatmap
	 */
	async getBeatmapScores(limit: number, gamemode: Gamemodes, beatmap: {beatmap_id: Beatmap["beatmap_id"]} | Beatmap,
	user?: {user_id?: User["user_id"], username?: User["username"]} | User, mods: Mods[] = []): Promise<ScoreWithReplayavailablePp[]> {
		const user_lookup = user ? user.user_id !== undefined ? `&u=${user.user_id}&type=id` : `&u=${user.username}&type=string` : ""
		const mods_bits = Mods.arrayToBits(mods)
		const scores = await this.request("get_scores", `b=${beatmap.beatmap_id}&m=${gamemode}${mods_bits !== null ? "&mods="+mods_bits : ""}${user_lookup}&limit=${limit}`)
		scores.forEach((s: any) => s.enabled_mods = Mods.bitsToArray(s.enabled_mods))
		return scores
	}

	/**
	 * @param id The ID of the `Match`
	 * @returns A Promise with a `Match`
	 * @remarks If the API's server is set to `https://ripple.moe/api`, `getMatch` might not work as it's currently unsupported by Ripple,
	 * see https://docs.ripple.moe/docs/api/peppy
	 */
	async getMatch(id: number): Promise<Match> {
		const match: Match = await this.request("get_match", `mp=${id}`)
		match.games.forEach((g) => {
			g.mods = Mods.bitsToArray(g.mods as any)
			g.scores.forEach((s) => {
				s.enabled_mods = s.enabled_mods === null ? null : Mods.bitsToArray(s.enabled_mods as any)
			})
		})
		return match
	}

	/**
	 * Specify the gamemode the score was set in, then say if you know the id of the `Score` OR if you know the score's `User`, `Beatmap`, and `Mods`
	 * @param gamemode A number representing the `Gamemode` the `Score` was set in
	 * @param replay An Object that contains a score with an id, or an Object that specifies info about the score (`User`, `Beatmap`, and `Mods`)
	 * @returns If possible, a `Replay` of that `Score`
	 * @remarks If the API's server is set to `https://ripple.moe/api`, `getReplay` might not work as it's currently unsupported by Ripple,
	 * see https://docs.ripple.moe/docs/api/peppy
	 */
	async getReplay(
		gamemode: Gamemodes,
		replay: {
			score_id?: number,
			search?: {
				user: {user_id?: User["user_id"], username?: User["username"]} | User,
				beatmap: {beatmap_id: Beatmap["beatmap_id"]} | Beatmap,
				mods: Mods[]
			}
		}
	): Promise<Replay> {
		const [score_id, search] = [replay.score_id, replay.search]
		const mods_bits = search?.mods ? Mods.arrayToBits(search.mods) : null
		let lookup = ""
		
		if (score_id !== undefined) {
			lookup = `s=${score_id}`
		} else if (search !== undefined) {
			if (search.user.user_id !== undefined) {
				lookup = `u=${search.user.user_id}&type=id`
			} else if (search.user.username !== undefined) {
				lookup = `u=${search.user.username}&type=string`
			}
			lookup += `&b=${search.beatmap.beatmap_id}`
			lookup += mods_bits !== null ? `&mods=${mods_bits}` : ""
		}

		return await this.request("get_replay", `${lookup}&m=${gamemode}`)
	}
}
