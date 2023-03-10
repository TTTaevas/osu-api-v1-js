import axios, { AxiosError, AxiosResponse } from "axios"
import { User } from "./user"
import { Score } from "./score"
import { Beatmap, Categories, Genres, Languages } from "./beatmap"
import { Match, MultiplayerModes, WinConditions } from "./match"
import { Mods, unsupported_mods } from "./mods"
import { Replay } from "./replay"
import { Gamemodes, getMods, getLength, getURL, adjustBeatmapStatsToMods } from "./misc"

export {Gamemodes, User, Score, Mods, Replay}
export {Beatmap, Categories, Genres, Languages}
export {Match, MultiplayerModes, WinConditions}
export {getMods, getLength, getURL, adjustBeatmapStatsToMods}

export class APIError {
	message: string
	/**
	 * @param message The reason why things didn't go as expected
	 */
	constructor(message: string) {
		this.message = message
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
		this.server = server === undefined ? "https://osu.ppy.sh/api/" : server
	}

	/**
	 * @param type Basically the endpoint, what comes in the URL after `api/`
	 * @param params The things to specify in the request, such as the beatmap_id when looking for a beatmap
	 * @param number_try How many attempts there's been to get the data
	 * @returns A Promise with either the API's response or `false` upon failing
	 */
	private async request(type: string, params: string, number_try?: number): Promise<AxiosResponse["data"] | false> {
		const max_tries = 5
		if (!number_try) {number_try = 1}
		let to_retry = false
	
		const resp = await axios({
			method: "get",
			baseURL: this.server,
			url: `/${type}?k=${this.key}&${params}`,
			headers: {
				"Accept": "application/json",
				"Accept-Encoding": "gzip",
				"Content-Type": "application/json",
				"User-Agent": "osu-api-v1-js (https://github.com/TTTaevas/osu-api-v1-js)"
			}
		})
		.catch((error: Error | AxiosError) => {
			if (axios.isAxiosError(error)) {
				if (error.response) {
					console.log("osu!api v1 ->", error.response.statusText, error.response.status, {type, params})
					if (error.response.status === 401) console.log("osu!api v1 -> Server responded with status code 401, are you sure you're using a valid API key?")
					if (error.response.status === 429) {
						console.log("osu!api v1 -> Server responded with status code 429, you're sending too many requests at once and are getting rate-limited!")
						if (number_try !== undefined && number_try < max_tries) {console.log(`osu!api v1 -> Will request again in a few instants... (Try #${number_try})`)}
						to_retry = true
					}
				} else if (error.request) {
					console.log("osu!api v1 ->", "Request made but server did not respond", `(Try #${number_try})`, {type, params})
					to_retry = true
				} else { // Something happened in setting up the request that triggered an error, I think
					console.error(error)
				}
			} else {
				console.error(error)
			}
		})
		
		if (resp) {
			if (this.verbose) console.log("osu!api v1 ->", resp.statusText, resp.status, {type, params})
			return resp.data
		} else {
			/**
			 * Under specific circumstances, we want to retry our request automatically
			 * However, spamming the server during the same second in any of these circumstances would be pointless
			 * So we wait for 1 to 5 seconds to make our request, 5 times maximum
			 */
			if (to_retry && number_try < max_tries) {
				let to_wait = (Math.floor(Math.random() * (500 - 100 + 1)) + 100) * 10
				await new Promise(res => setTimeout(res, to_wait))
				return await this.request(type, params, number_try + 1)
			} else {
				return false
			}
		}
	}

	/**
	 * @param gamemode The `User`'s `Gamemode`
	 * @param user An Object with either a `user_id` or a `username` (ignores `username` if `user_id` is specified)
	 * @returns A Promise with a `User` found with the search
	 */
	async getUser(gamemode: Gamemodes, user: {user_id?: number, username?: string} | User): Promise<User | APIError> {
		if (!user.user_id && !user.username) {return new APIError("No proper `user` argument was given")}
		let lookup = user.user_id !== undefined ? `u=${user.user_id}&type=id` : `u=${user.username}&type=string`
	
		let response = await this.request("get_user", `${lookup}&m=${gamemode}`)
		if (!response || !response[0]) {return new APIError(`No User could be found (gamemode: ${Gamemodes[gamemode]} | user lookup: ${lookup})`)}
		return correctType(response[0]) as User
	}

	/**
	 * @param limit The maximum number of Scores to get, **cannot exceed 100**
	 * @param gamemode The `User`'s `Gamemode`
	 * @param user An Object with either a `user_id` or a `username` (ignores `username` if `user_id` is specified)
	 * @param plays The `User`'s top pp plays/`Scores` or the `User`'s plays/`Scores` within the last 24 hours
	 * @returns A Promise with an array of `Scores` set by the `User` in a specific `Gamemode`
	 */
	async getUserScores(limit: number, gamemode: Gamemodes, user: {user_id?: number, username?: string} | User, plays: "best" | "recent"): Promise<Score[] | APIError> {
		let scores: Score[] = []
		if (!user.user_id && !user.username) {return new APIError("No proper `user` argument was given")}
		let lookup = user.user_id !== undefined ? `u=${user.user_id}&type=id` : `u=${user.username}&type=string`
	
		let response = await this.request(`get_user_${plays}`, `${lookup}&m=${gamemode}&limit=${limit}`)
		if (response) response.forEach((s: Object) => scores.push(correctType(s) as Score))
		if (!scores.length) {return new APIError(`No ${plays} Score could be found (gamemode: ${Gamemodes[gamemode]} | user lookup: ${lookup})`)}
		return scores
	}

	/**
	 * Look for and get a singular `Beatmap` with this!
	 * @param beatmap An Object with the ID of the difficulty/`Beatmap` of the beatmapset
	 * @param mods A number representing the `Mods` to apply, defaults to 0 (no mod/`None`)
	 * @param gamemode The gamemode the beatmap is in (useful if you wanna convert, for example, an osu! map to taiko)
	 * @returns A Promise with a `Beatmap`
	 */
	async getBeatmap(beatmap: {beatmap_id: number} | Beatmap, mods?: Mods, gamemode?: Gamemodes): Promise<Beatmap | APIError> {
		if (mods === undefined) {mods = Mods.None}
		if (getMods(mods).includes(Mods[Mods.Nightcore]) && !getMods(mods).includes(Mods[Mods.DoubleTime])) {mods -= Mods.Nightcore - Mods.DoubleTime}
		unsupported_mods.forEach((mod) => getMods(mods!).includes(Mods[mod]) ? mods! -= mod : mods! -= 0)
		let g = gamemode !== undefined ? `&mode=${gamemode}&a=1` : ""
	
		let response = await this.request("get_beatmaps", `b=${beatmap.beatmap_id}&mods=${mods}${g}`)
		if (!response || !response[0]) {
			return new APIError(`No Beatmap could be found (beatmap_id: ${beatmap.beatmap_id}${gamemode !== undefined ? `| gamemode: ${Gamemodes[gamemode]}` : ""})`)
		}

		return adjustBeatmapStatsToMods(correctType(response[0]) as Beatmap, mods)
	}

	/**
	 * Look for and get `Beatmap`s with this! Returns an `APIError` if the array would be empty
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
	): Promise<Beatmap[] | APIError> {
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
			} else {
				return new APIError("The `beatmap` argument was given but it doesn't have at least one good property!")
			}
		}

		if (set_owner) {
			if (set_owner.user_id !== undefined) {
				lookup += `&u=${set_owner.user_id}&type=id`
			} else if (set_owner.username !== undefined) {
				lookup += `&u=${set_owner.username}&type=string`
			} else {
				return new APIError("The `set_owner` argument was given but it doesn't have at least one good property!")
			}
		}

		if (since) {
			let x = since.toISOString().replace("T", " ")
			lookup += x.substring(0, x.indexOf("Z") - 4)
		}

		let response = await this.request("get_beatmaps", `limit=${limit}${mode}&${convert}${lookup}`)
		if (!response || !response[0]) {
			return new APIError(
				`No Beatmap could be found (lookup: ${lookup}${gamemode.gamemode !== undefined && gamemode.gamemode !== "all" ? `| gamemode: ${Gamemodes[gamemode.gamemode]}` : ""})`
			)
		}
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
	user?: {user_id?: number, username?: string} | User, mods?: Mods): Promise<Score[] | APIError> {
		let scores: Score[] = []
	
		if (user && !user.user_id && !user.username) {return new APIError("The `user` argument lacks a user_id/username property")}
		let user_lookup = user ? user.user_id !== undefined ? `u=${user.user_id}&type=id` : `u=${user.username}&type=string` : ""
		
		let response = await this.request("get_scores", `b=${beatmap.beatmap_id}&m=${gamemode}${mods ? "&mods="+mods : ""}${user_lookup}&limit=${limit}`)
		if (response) response.forEach((s: Object) => scores.push(correctType(s) as Score))
		if (!scores.length) {
			return new APIError(`No Score could be found (gamemode: ${Gamemodes[gamemode]} | beatmap_id: ${beatmap.beatmap_id}${user ? `user lookup: ${user}` : ""})`)
		}
	
		return scores
	}

	/**
	 * @param id The ID of the `Match`
	 * @returns A Promise with a `Match`
	 * @remarks If the API's server is set to `https://ripple.moe/api`, `getMatch` might not work as it's currently unsupported by Ripple,
	 * see https://docs.ripple.moe/docs/api/peppy
	 */
	async getMatch(id: number): Promise<Match | APIError> {
		let response = await this.request("get_match", `mp=${id}`)
		if (response.match === 0 || response.match === undefined || response.length === 0) {return new APIError(`No Match could be found (id: ${id})`)}
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
	search?: {user: {user_id?: number, username?: string} | User, beatmap: {beatmap_id: number} | Beatmap, mods: Mods}): Promise<Replay | APIError> {
		let lookup: string

		if (score !== undefined) {
			lookup = `s=${score.score_id}`
		} else if (search !== undefined) {
			if (search.user.user_id !== undefined) {
				lookup = `u=${search.user.user_id}&type=id`
			} else if (search.user.username !== undefined) {
				lookup = `u=${search.user.username}&type=string`
			} else {
				return new APIError("No proper `score.search.user` argument was given (it lacks either an `user_id` or an `username`)")
			}
			lookup += `&b=${search.beatmap.beatmap_id}`
			lookup += `&mods=${search.mods}`
		} else {
			return new APIError("No proper `score` or `search` argument was given")
		}

		let response = await this.request("get_replay", `${lookup}&m=${gamemode}`)
		if (!response || !response.content) {return new APIError(`No Replay could be found (gamemode: ${Gamemodes[gamemode]} | score lookup: ${lookup})`)}
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
