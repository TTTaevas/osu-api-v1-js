import axios, { AxiosError, AxiosResponse } from "axios"
import { User } from "./user"
import { Score } from "./score"
import { adjustBeatmapStatsToMods, Beatmap, Categories, Genres, Languages } from "./beatmap"
import { Match } from "./match"
import { Mods, ModsShort, unsupported_mods } from "./mods"

function correctType(x: any): any {
	if (!isNaN(x)) {
		return Number(x)
	} else if (/[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}/.test(x)) {
		return new Date(x + "Z")
	} else if (Array.isArray(x)) {
		return x.map((e) => correctType(e))
	} else if (typeof x === "object" && x !== null) {
		const k = Object.keys(x)
		const v = Object.values(x)
		for (let i = 0; i < k.length; i++) {
			x[k[i]] = correctType(v[i])
		}
		return x
	} else {
		return x
	}
}

export {User, Score, Beatmap, Match, Mods, ModsShort}

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
				"Content-Type": "application/json"
			}
		})
		.catch((error: Error | AxiosError) => {
			if (axios.isAxiosError(error)) {
				if (error.response) {
					if (this.verbose) console.log("osu!api v1 ->", error.response.statusText, error.response.status, {type, params})
				} else if (error.request) {
					if (this.verbose) console.log("osu!api v1 ->", "Request made but server did not respond", `Try #${number_try}`, {type, params})
					to_retry = true
				} else { // Something happened in setting up the request that triggered an error, I think
					if (this.verbose) console.error(error)
				}
			} else {
				if (this.verbose) console.error(error)
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
	 * @param mode The User's gamemode; 0: osu!, 1: taiko, 2: ctb, 3: mania
	 * @returns A Promise with a User found with the search
	 */
	async getUser(search: {user_id?: number, username?: string} | User, mode: number): Promise<User | APIError> {
		if (!search.user_id && !search.username) {return new APIError("No proper `search` argument was given")}
		let type = search.user_id ? "id" : "string"
	
		let response = await this.request("get_user", `u=${type == "id" ? search.user_id : search.username}&type=${type}&m=${mode}`)
		if (!response[0]) {return new APIError(`No User could be found (user_id: ${search.user_id} | username: ${search.username})`)}
		return correctType(response[0]) as User
	}

	/**
	 * @param user An Object with either a `user_id` or a `username`
	 * @param mode The User's gamemode; 0: osu!, 1: taiko, 2: ctb, 3: mania
	 * @param plays The User's top pp plays or the User's plays within the last 24 hours
	 * @param limit The maximum number of scores to get, cannot exceed 100
	 * @returns A Promise with an array of Scores set by the User in a specific mode
	 */
	async getUserScores(user: {user_id?: number, username?: string} | User, mode: number, plays: "best" | "recent", limit?: number): Promise<Score[] | APIError> {
		let scores: Score[] = []
	
		if (!user.user_id && !user.username) {return new APIError("No proper `search` argument was given")}
		let type = user.user_id ? "id" : "string"
	
		let response = await this.request(`get_user_${plays}`, `u=${type == "id" ? user.user_id : user.username}&type=${type}&m=${mode}&limit=${limit || 5}`)
		if (response) response.forEach((s: Object) => scores.push(correctType(s) as Score))
		if (!scores.length) {return new APIError(`No Score could be found (user_id: ${user.user_id} | username: ${user.username})`)}
	
		return scores
	}

	/**
	 * @param diff_id The ID of the difficulty/beatmap of the beatmapset
	 * @param mods A number representing the mods to apply
	 * @returns A Promise with a Beatmap
	 */
	async getBeatmap(diff_id: number, mods: Mods): Promise<Beatmap | APIError> {
		unsupported_mods.forEach((mod) => getMods(mods, "long").includes(Mods[mod]) ? mods -= mod : mods -= 0)
		if (getMods(mods, "long").includes(Mods[Mods.Nightcore])) {mods -= Mods.Nightcore - Mods.DoubleTime}
	
		let response = await this.request("get_beatmaps", `b=${diff_id}&mods=${mods}`)
		if (!response[0]) {return new APIError(`No Beatmap could be found (diff_id: ${diff_id})`)}
		let beatmap: Beatmap = adjustBeatmapStatsToMods(correctType(response[0]) as Beatmap, mods)

		beatmap.getLength = (type: "hit" | "total") => {
			let length = type === "hit" ? beatmap.hit_length : beatmap.total_length
			let m: number = 0
			let s: string | number = 0
			
			while (length >= 60) {m += 1; length -= 60}
			while (length >= 1) {s += 1; length -= 1}
			if (s < 10) {s = `0${s}`}
			
			return `${m}:${s}`
		}
		beatmap.getCategory = () => {return Categories[beatmap.approved]}
		beatmap.getGenre = () => {return Genres[beatmap.genre_id]}
		beatmap.getLanguage = () => {return Languages[beatmap.language_id]}

		return beatmap
	}

	/**
	 * @param diff_id The ID of the difficulty/beatmap of the beatmapset
	 * @param mode The Scores' gamemode; 0: osu!, 1: taiko, 2: ctb, 3: mania
	 * @param user The Scores' user, which is an Object with either a `user_id` or a `username`
	 * @param mods A number representing the mods to apply
	 * @param limit The maximum number of scores to get, cannot exceed 100
	 * @returns A Promise with an array of Scores set on a beatmap
	 */
	async getBeatmapScores(diff_id: number, mode: number, user?: {user_id?: number, username?: string} | User, mods?: ModsShort, limit?: number): Promise<Score[] | APIError> {
		let scores: Score[] = []
	
		if (user && !user.user_id && !user.username) {return scores}
		let type = user ? user.user_id ? "id" : user.username ? "string" : false : false
	
		let response = await this.request("get_scores", `b=${diff_id}&m=${mode}${type ? type == "id" ? "&u="+user!.user_id : "&u="+user!.username : ""}
		${mods ? "&mods="+mods : ""}${type ? "&type="+type : ""}&limit=${limit || 5}`)
		if (response) response.forEach((s: Object) => scores.push(correctType(s) as Score))
		if (!scores.length) {return new APIError(`No Score could be found (diff_id: ${diff_id})`)}
	
		return scores
	}

	/**
	 * @param id The ID of the match
	 * @returns A Promise with a Match
	 */
	async getMatch(id: number): Promise<Match | APIError> {
		let response = await this.request("get_match", `mp=${id}`)
		if (!response.match) {return new APIError(`No Match could be found (id: ${id})`)}
		response.games.forEach((g: any) => {
			g.getScoringType = () => {
				return ["score", "accuracy", "combo", "scorev2"][g.scoring_type]
			}
		})
		return correctType(response) as Match
	}
}

/**
 * @param id The ID of the gamemode (should be from 0 to 3)
 * @returns A text version of the gamemode
 */
export function getMode(id: number): string {
	return ["osu!", "taiko", "catch the beat", "osu!mania"][id]
}

/**
 * @param value A number representing the mods to apply
 * @param version Whether the mods are shown respectively like `["HD", "HR"]` or `["Hidden", "HardRock"]`
 * @returns An Array of Strings, each string representing a mod
 */
export function getMods(value: Mods | ModsShort, version: "short" | "long"): string[] {
	let arr: string[] = []
	for (let bit = 1; bit != 0; bit <<= 1) { 
		if (version == "short") {
			if ((value & bit) != 0 && bit in ModsShort) {arr.push(ModsShort[bit])}
		} else {
			if ((value & bit) != 0 && bit in Mods) {arr.push(Mods[bit])}
		}
	}
	return arr
}
