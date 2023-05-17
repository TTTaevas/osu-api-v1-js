import fetch, { FetchError } from "node-fetch"
import { User } from "./user.js"
import { Score } from "./score.js"
import { Beatmap, Categories, Genres, Languages } from "./beatmap.js"
import { Match, MultiplayerModes, WinConditions } from "./match.js"
import { Mods, unsupported_mods } from "./mods.js"
import { Replay } from "./replay.js"
import { Gamemodes, getMods, getLength, getURL, adjustBeatmapStatsToMods } from "./misc.js"

export {Gamemodes, User, Score, Mods, Replay}
export {Beatmap, Categories, Genres, Languages}
export {Match, MultiplayerModes, WinConditions}
export {getMods, getLength, getURL, adjustBeatmapStatsToMods}

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

export class API {
	key: string
	verbose: boolean
	server: string
	/**
	 * @param key Your API key, which you can get at https://osu.ppy.sh/p/api
	 * @param verbose (default `false`) Whether or not requests should be logged
	 * @param server (default `https://osu.ppy.sh/api/`) The server where the requests should be sent to
	 */
	constructor(key: string, verbose?: boolean, server?: string) {
		this.key = key
		this.verbose = verbose || false
		this.server = server || "https://osu.ppy.sh/api/"
	}

	private log(...to_log: any[]) {
		if (this.verbose) {
			console.log("osu!api v1 ->", ...to_log)
		}
	}

	/**
	 * @param endpoint Basically the endpoint, what comes in the URL after `api/`
	 * @param parameters The things to specify in the request, such as the beatmap_id when looking for a beatmap
	 * @param number_try How many attempts there's been to get the data
	 * @returns A Promise with either the API's response or `false` upon failing
	 */
	private async request(endpoint: string, parameters: string, number_try?: number): Promise<any> {
		const max_tries = 5
		if (!number_try) {number_try = 1}
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
		.catch((error: FetchError) => {
			this.log(error.message)
			err = `${error.name} (${error.errno})`
		})
		
		if (!response || !response.ok) {
			if (response) {
				err = response.statusText
				if (response.status === 401) {
					this.log("Server responded with status code 401, are you sure you're using a valid API key?")
				} else if (response.status === 429) {
					this.log("Server responded with status code 429, you're sending too many requests at once and are getting rate-limited!")
					to_retry = true
				}
			}

			if (to_retry === true && number_try < max_tries) {
				this.log("Will request again in a few instants...", `(Try #${number_try})`)
				let to_wait = (Math.floor(Math.random() * (500 - 100 + 1)) + 100) * 10
				await new Promise(res => setTimeout(res, to_wait))
				return await this.request(endpoint, parameters, number_try + 1)
			}

			throw new APIError(err, this.server, endpoint, parameters)
		}
		
		this.log(response.statusText, response.status, {endpoint, parameters})
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
		return json
	}

	/**
	 * @param gamemode The `User`'s `Gamemode`
	 * @param user An Object with either a `user_id` or a `username` (ignores `username` if `user_id` is specified)
	 * @returns A Promise with a `User` found with the search
	 */
	async getUser(gamemode: Gamemodes, user: {user_id?: number, username?: string} | User): Promise<User> {
		let lookup = user.user_id !== undefined ? `u=${user.user_id}&type=id` : `u=${user.username}&type=string`
		let response = await this.request("get_user", `m=${gamemode}&${lookup}`) as User[]
		return correctType(response[0])
	}

	/**
	 * @param limit The maximum number of Scores to get, **cannot exceed 100**
	 * @param gamemode The `User`'s `Gamemode`
	 * @param user An Object with either a `user_id` or a `username` (ignores `username` if `user_id` is specified)
	 * @param plays The `User`'s top pp plays/`Scores` or the `User`'s plays/`Scores` within the last 24 hours
	 * @returns A Promise with an array of `Scores` set by the `User` in a specific `Gamemode`
	 */
	async getUserScores(limit: number, gamemode: Gamemodes, user: {user_id?: number, username?: string} | User, plays: "best" | "recent"): Promise<Score[]> {
		let lookup = user.user_id !== undefined ? `u=${user.user_id}&type=id` : `u=${user.username}&type=string`
		let response = await this.request(`get_user_${plays}`, `${lookup}&m=${gamemode}&limit=${limit}`) as Score[]
		return correctType(response)
	}

	/**
	 * Look for and get a singular `Beatmap` with this!
	 * @param beatmap An Object with the ID of the difficulty/`Beatmap` of the beatmapset
	 * @param mods A number representing the `Mods` to apply, defaults to 0 (no mod/`None`)
	 * @param gamemode The gamemode the beatmap is in (useful if you wanna convert, for example, an osu! map to taiko)
	 * @returns A Promise with a `Beatmap`
	 */
	async getBeatmap(beatmap: {beatmap_id: number} | Beatmap, mods?: Mods, gamemode?: Gamemodes): Promise<Beatmap> {
		if (mods === undefined) {mods = Mods.None}
		if (getMods(mods).includes(Mods[Mods.Nightcore]) && !getMods(mods).includes(Mods[Mods.DoubleTime])) {mods -= Mods.Nightcore - Mods.DoubleTime}
		unsupported_mods.forEach((mod) => getMods(mods!).includes(Mods[mod]) ? mods! -= mod : mods! -= 0)
		let g = gamemode !== undefined ? `&mode=${gamemode}&a=1` : ""
	
		let response = await this.request("get_beatmaps", `b=${beatmap.beatmap_id}&mods=${mods}${g}`) as Beatmap[]
		return adjustBeatmapStatsToMods(correctType(response[0]), mods)
	}

	/**
	 * Look for and get `Beatmap`s with this! Throws an `APIError` if the array would be empty
	 * @param limit The maximum number of `Beatmap`s there should be in the array, **cannot exceed 500**
	 * @param gamemode Filter in the beatmaps by the gamemode (unless "all"), but if `allow_converts` then instead convert if possible the beatmaps to that gamemode
	 * @param beatmap Will look for its `beatmapset_id` (if undefined, its `beatmap_id` (if undefined, its `file_md5`))
	 * @param mods A number representing the `Mods` to apply, defaults to 0 (no mod/`None`)
	 * @param set_owner The `User` that owns the beatmapset
	 * @param since Filters out any `Beatmap` of `Category < 0`, and any `Beatmap` with an `approved_date` older than what's given
	 */
	async getBeatmaps(
	limit: number, gamemode: {gamemode: Gamemodes | "all", allow_converts?: boolean},
	beatmap?: {beatmapset_id?: number, beatmap_id?: number, file_md5?: string} | Beatmap,
	mods?: Mods,
	set_owner?: {user_id?: number, username?: string} | User,
	since?: Date
	): Promise<Beatmap[]> {
		if (mods === undefined) {mods = Mods.None}
		if (getMods(mods).includes(Mods[Mods.Nightcore]) && !getMods(mods).includes(Mods[Mods.DoubleTime])) {mods -= Mods.Nightcore - Mods.DoubleTime}
		unsupported_mods.forEach((mod) => getMods(mods!).includes(Mods[mod]) ? mods! -= mod : mods! -= 0)
		let lookup = `mods=${mods}`
		let mode = gamemode.gamemode == "all" ? "" : `&m=${gamemode.gamemode}`
		let convert = gamemode.allow_converts ? "a=1" : "a=0"
		
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

		let response = await this.request("get_beatmaps", `limit=${limit}${mode}&${convert}${lookup}`) as Beatmap[]
		let beatmaps: Beatmap[] = response.map((b: Beatmap) => adjustBeatmapStatsToMods(correctType(b), mods || Mods.None))
		return beatmaps
	}

	/**
	 * @param limit The maximum number of `Scores` to get, **cannot exceed 100**
	 * @param gamemode A number representing the `Scores`' `Gamemode`
	 * @param beatmap An Object with the ID of the difficulty/`Beatmap` of the beatmapset
	 * @param user The `Scores`' user, which is an Object with either a `user_id` or a `username`
	 * @param mods A number representing the `Mods` to apply, defaults to 0 (no mod)
	 * @returns A Promise with an array of `Scores` set on a beatmap
	 */
	async getBeatmapScores(limit: number, gamemode: Gamemodes, beatmap: {beatmap_id: number} | Beatmap,
	user?: {user_id?: number, username?: string} | User, mods?: Mods): Promise<Score[]> {
		let user_lookup = user ? user.user_id !== undefined ? `u=${user.user_id}&type=id` : `u=${user.username}&type=string` : ""
		let response = await this.request("get_scores", `b=${beatmap.beatmap_id}&m=${gamemode}${mods ? "&mods="+mods : ""}${user_lookup}&limit=${limit}`)
		return correctType(response) as Score[]
	}

	/**
	 * @param id The ID of the `Match`
	 * @returns A Promise with a `Match`
	 * @remarks If the API's server is set to `https://ripple.moe/api`, `getMatch` might not work as it's currently unsupported by Ripple,
	 * see https://docs.ripple.moe/docs/api/peppy
	 */
	async getMatch(id: number): Promise<Match> {
		let response = await this.request("get_match", `mp=${id}`)
		return correctType(response) as Match
	}
	
	/**
	 * Specify the gamemode the score was set in, then say if you know the id of the `Score` OR if you know the score's `User`, `Beatmap`, and `Mods`
	 * @param gamemode A number representing the `Gamemode` the `Score` was set in
	 * @param score An Object with a `score_id`, that obviously represents the id of the `Score`
	 * @param search An Object with stuff regarding the `User`, `Beatmap`, and `Mods`
	 * @returns If possible, a `Replay` of that `Score`
	 * @remarks If the API's server is set to `https://ripple.moe/api`, `getReplay` might not work as it's currently unsupported by Ripple,
	 * see https://docs.ripple.moe/docs/api/peppy
	 */
	async getReplay(gamemode: Gamemodes, score?: {score_id: number} | Score,
	search?: {user: {user_id?: number, username?: string} | User, beatmap: {beatmap_id: number} | Beatmap, mods: Mods}): Promise<Replay> {
		let lookup = ""

		if (score !== undefined) {
			lookup = `s=${score.score_id}`
		} else if (search !== undefined) {
			if (search.user.user_id !== undefined) {
				lookup = `u=${search.user.user_id}&type=id`
			} else if (search.user.username !== undefined) {
				lookup = `u=${search.user.username}&type=string`
			}
			lookup += `&b=${search.beatmap.beatmap_id}`
			lookup += `&mods=${search.mods}`
		}

		let response = await this.request("get_replay", `${lookup}&m=${gamemode}`)
		return correctType(response) as Replay
	}
}

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

	if (!isNaN(x)) {
		return x === null ? null : Number(x)
	} else if (/^[+-[0-9][0-9]+-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$/.test(x)) {
		return new Date(x + "Z") // add Z to string to specify it's UTC
	} else if (Array.isArray(x)) {
		return x.map((e) => correctType(e))
	} else if (typeof x === "object" && x !== null) {
		const k = Object.keys(x)
		const v = Object.values(x)
		for (let i = 0; i < k.length; i++) {
			x[k[i]] = bools.includes(k[i]) ? Boolean(Number(v[i])) : correctType(v[i])
		}
	}
	return x
}
