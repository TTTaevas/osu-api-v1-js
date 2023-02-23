import axios, { AxiosError, AxiosResponse } from "axios"
import { User } from "./user"
import { Score } from "./score"
import { adjustBeatmapStatsToMods, Beatmap, Categories, Genres, Languages } from "./beatmap"
import { Match } from "./match"
import { Mods, unsupported_mods } from "./mods"
import { Replay } from "./replay"

export {User, Score, Match, Mods, Replay}
export {Beatmap, Categories, Genres, Languages, adjustBeatmapStatsToMods}

export class APIError {
	message: string
	constructor(m: string) {
		this.message = m
	}
}

export class API {
	key: string
	verbose: boolean
	/**
	 * @param key Your API key, which you can get at https://osu.ppy.sh/p/api
	 * @param verbose (default `false`) Whether or not requests should be logged
	 */
	constructor(key: string, verbose?: boolean) {
		this.key = key
		this.verbose = verbose || false
	}

	/**
	 * @param type Basically the endpoint, what comes in the URL after `api/`
	 * @param params The things to specify in the request, such as the beatmap_id when looking for a beatmap
	 * @param number_try How many attempts there's been to get the data
	 * @returns A Promise with either the API's response or `false` upon failing
	 */
	private async request(type: string, params: string, number_try?: number): Promise<AxiosResponse["data"] | false> {
		if (!number_try) {number_try = 1}
		let to_retry = false
	
		const resp = await axios({
			method: "get",
			baseURL: "https://osu.ppy.sh/api/",
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
			if (to_retry && number_try < 5) {
				return await this.request(type, params, number_try + 1)
			} else {
				return false
			}
		}
	}

	/**
	 * @param search An Object with either a `user_id` or a `username` (ignores `username` if `user_id` is specified)
	 * @param mode The `User`'s `Gamemode`
	 * @returns A Promise with a `User` found with the search
	 */
	async getUser(search: {user_id?: number, username?: string} | User, mode: Gamemodes): Promise<User | APIError> {
		if (!search.user_id && !search.username) {return new APIError("No proper `search` argument was given")}
		let type = search.user_id ? "id" : "string"
	
		let response = await this.request("get_user", `u=${type == "id" ? search.user_id : search.username}&type=${type}&m=${mode}`)
		if (!response[0]) {return new APIError(`No User could be found (user_id: ${search.user_id} | username: ${search.username})`)}
		return correctType(response[0]) as User
	}

	/**
	 * @param user An Object with either a `user_id` or a `username` (ignores `username` if `user_id` is specified)
	 * @param mode The `User`'s `Gamemode`
	 * @param plays The `User`'s top pp plays/`Scores` or the `User`'s plays/`Scores` within the last 24 hours
	 * @param limit The maximum number of Scores to get, cannot exceed 100, defaults to 100
	 * @returns A Promise with an array of `Scores` set by the `User` in a specific `Gamemode`
	 */
	async getUserScores(user: {user_id?: number, username?: string} | User, mode: Gamemodes, plays: "best" | "recent", limit?: number): Promise<Score[] | APIError> {
		let scores: Score[] = []
	
		if (!user.user_id && !user.username) {return new APIError("No proper `user` argument was given")}
		let type = user.user_id ? "id" : "string"
	
		let response = await this.request(`get_user_${plays}`, `u=${type == "id" ? user.user_id : user.username}&type=${type}&m=${mode}&limit=${limit || 100}`)
		if (response) response.forEach((s: Object) => scores.push(correctType(s) as Score))
		if (!scores.length) {return new APIError(`No Score could be found (user_id: ${user.user_id} | username: ${user.username})`)}
	
		return scores
	}

	/**
	 * Look for and get a singular `Beatmap` with this!
	 * @param beatmap An Ibject with the ID of the difficulty/`Beatmap` of the beatmapset
	 * @param mods A number representing the `Mods` to apply, defaults to 0 (no mod/`None`)
	 * @param mode The gamemode the beatmap is in (useful if you wanna convert, for example, an osu! map to taiko)
	 * @returns A Promise with a `Beatmap`
	 */
	async getBeatmap(beatmap: {beatmap_id: number} | Beatmap, mods?: Mods, mode?: Gamemodes): Promise<Beatmap | APIError> {
		if (mods === undefined) {mods = Mods.None}
		unsupported_mods.forEach((mod) => getMods(mods!).includes(Mods[mod]) ? mods! -= mod : mods! -= 0)
		if (getMods(mods).includes(Mods[Mods.Nightcore])) {mods -= Mods.Nightcore - Mods.DoubleTime}
		if (mode === undefined) {mode = Gamemodes.OSU}
	
		let response = await this.request("get_beatmaps", `b=${beatmap.beatmap_id}&mods=${mods}&mode=${mode}&a=1`)
		if (!response[0]) {return new APIError(`No Beatmap could be found (beatmap_id: ${beatmap.beatmap_id})`)}

		return adjustBeatmapStatsToMods(correctType(response[0]) as Beatmap, mods)
	}

	/**
	 * Look for and get `Beatmap`s with this! Returns an `APIError` if the array would be empty
	 * @param limit (max is 500) The maximum amount of `Beatmap`s there should be in the array
	 * @param mode The gamemode the beatmap is in (useful if you wanna convert, for example, an osu! map to taiko)
	 * @param beatmap Will look for its `beatmapset_id` (if undefined, its `beatmap_id` (if undefined, its `file_md5`))
	 * @param mods A number representing the `Mods` to apply, defaults to 0 (no mod/`None`)
	 * @param set_owner The `User` that owns the beatmapset
	 * @param since Filters out any `Beatmap` of `Category < 0`, and any `Beatmap` with an `approved_date` older than what's given
	 */
	async getBeatmaps(
	limit: number, mode: Gamemodes,
	beatmap?: {beatmapset_id?: number, beatmap_id?: number, file_md5?: string} | Beatmap,
	mods?: Mods,
	set_owner?: {user_id?: number, username?: string} | User,
	since?: Date
	): Promise<Beatmap[] | APIError> {
		if (mods === undefined) {mods = Mods.None}
		unsupported_mods.forEach((mod) => getMods(mods!).includes(Mods[mod]) ? mods! -= mod : mods! -= 0)
		if (getMods(mods).includes(Mods[Mods.Nightcore])) {mods -= Mods.Nightcore - Mods.DoubleTime}
		let lookup = `mods=${mods}`
		
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

		let response = await this.request("get_beatmaps", `limit=${limit}&m=${mode}&a=1${lookup}`)
		if (!response[0]) {return new APIError(`No Beatmap could be found`)}
		let beatmaps: Beatmap[] = response.map((b: Beatmap) => adjustBeatmapStatsToMods(correctType(b), mods || Mods.None))

		return beatmaps
	}

	/**
	 * @param diff_id The ID of the difficulty/beatmap of the beatmapset
	 * @param mode A number representing the `Scores`' `Gamemode`
	 * @param user The `Scores`' user, which is an Object with either a `user_id` or a `username`
	 * @param mods A number representing the `Mods` to apply, defaults to 0 (no mod)
	 * @param limit The maximum number of `Scores` to get, cannot exceed 100, defaults to 100
	 * @returns A Promise with an array of `Scores` set on a beatmap
	 */
	async getBeatmapScores(diff_id: number, mode: Gamemodes, user?: {user_id?: number, username?: string} | User, mods?: Mods, limit?: number): Promise<Score[] | APIError> {
		let scores: Score[] = []
	
		if (user && !user.user_id && !user.username) {return new APIError("The `user` argument lacks a user_id/username property")}
		let type = user ? user.user_id ? "id" : user.username ? "string" : false : false
		let r_user = type ? type == "id" ? "&u="+user!.user_id : "&u="+user!.username : ""
		
		let response = await this.request("get_scores", `b=${diff_id}&m=${mode}${r_user}${mods ? "&mods="+mods : ""}${type ? "&type="+type : ""}&limit=${limit || 100}`)
		if (response) response.forEach((s: Object) => scores.push(correctType(s) as Score))
		if (!scores.length) {return new APIError(`No Score could be found (diff_id: ${diff_id})`)}
	
		return scores
	}

	/**
	 * @param id The ID of the `Match`
	 * @returns A Promise with a `Match`
	 */
	async getMatch(id: number): Promise<Match | APIError> {
		let response = await this.request("get_match", `mp=${id}`)
		if (!response.match) {return new APIError(`No Match could be found (id: ${id})`)}
		return correctType(response) as Match
	}
	
	/**
	 * Specify the gamemode the score was set in, then say if you know the id of the `Score` OR if you know the score's `User`, `Beatmap`, and `Mods`
	 * @param mode A number representing the `Gamemode` the `Score` was set in
	 * @param score An Object with a `score_id`, that obviously represents the id of the `Score`
	 * @param search An Object with stuff regarding the `User`, `Beatmap`, and `Mods`
	 * @returns If possible, a `Replay` of that `Score`
	 */
	async getReplay(mode: Gamemodes, score?: {score_id: number} | Score,
	search?: {user: {user_id?: number, username?: string} | User, beatmap: {beatmap_id: number} | Beatmap, mods: Mods}): Promise<Replay | APIError> {
		let lookup: string
		let type: string | Boolean

		if (score !== undefined) {
			lookup = `s=${score.score_id}`
			type = false
		} else if (search !== undefined) {
			if (search.user.user_id !== undefined) {
				lookup = `u=${search.user.user_id}`
				type = "id"
			} else if (search.user.username !== undefined) {
				lookup = `u=${search.user.username}`
				type = "string"
			} else {
				return new APIError("No proper `score.search.user` argument was given (it lacks either an `user_id` or an `username`)")
			}
			lookup += `&b=${search.beatmap.beatmap_id}`
			lookup += `&mods=${search.mods}`
		} else {
			return new APIError("No proper `score` or `search` argument was given")
		}

		let response = await this.request("get_replay", `${lookup}&m=${mode}${type ? "&type="+type : ""}`)
		if (!response.content) {return new APIError(`No Replay could be found`)}
		return correctType(response) as Replay
	}
}

/**
 * https://osu.ppy.sh/wiki/en/Game_mode
 */
export enum Gamemodes {
	/**
	 * https://osu.ppy.sh/wiki/en/Game_mode/osu!
	 */
	OSU 	= 0,
	/**
	 * https://osu.ppy.sh/wiki/en/Game_mode/osu!taiko
	 */
	TAIKO = 1,
	/**
	 * https://osu.ppy.sh/wiki/en/Game_mode/osu!catch
	 */
	CTB 	= 2,
	/**
	 * https://osu.ppy.sh/wiki/en/Game_mode/osu!mania
	 */
	MANIA = 3,
}

/**
 * https://osu.ppy.sh/wiki/en/Client/Interface/Multiplayer#team-mode-gameplay
 */
export enum MultiplayerModes {
	"HEAD TO HEAD" = 0,
	"TAG CO-OP" 	 = 1,
	"TEAM VS" 		 = 2,
	"TAG TEAM VS"  = 3,
}

/**
 * https://osu.ppy.sh/wiki/en/Client/Interface/Multiplayer#win-condition
 */
export enum WinConditions {
	SCORE 		 = 0,
	ACCURACY 	 = 1,
	COMBO 		 = 2,
	"SCORE V2" = 3,
}

/**
 * @param value A number representing the `Mods`
 * @returns An Array of Strings, each string representing a mod
 */
export function getMods(value: Mods): string[] {
	let arr: string[] = []
	for (let bit = 1; bit != 0; bit <<= 1) { 
		if ((value & bit) != 0 && bit in Mods) {arr.push(Mods[bit])}
	}
	return arr
}

/**
 * This function exists in case you need help getting a Beatmap's length in a readable way
 * @param seconds A number of seconds
 * @returns A String that represents `seconds` in format m:ss (with support for hours if needed)
 */
export function getLength(seconds: number): string {
	let h: string | number = 0
	let m: string | number = 0
	let s: string | number = 0
	
	while (seconds >= 3600) {h += 1; seconds -= 3600}
	while (seconds >= 60) {m += 1; seconds -= 60}
	if (m < 10 && h > 0) {m = `0${m}`}
	while (seconds >= 1) {s += 1; seconds -= 1}
	if (s < 10) {s = `0${s}`}
	
	return `${h > 0 ? `${h}:` : ""}${m}:${s}`
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
		return Number(x)
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
