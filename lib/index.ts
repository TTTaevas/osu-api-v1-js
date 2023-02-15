import axios, { AxiosError, AxiosResponse } from "axios"
import { User } from "./user"
import { Score } from "./score"
import { Beatmap } from "./beatmap"
import { Match } from "./match"
import { Mods, ModsShort } from "./mods"

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
	 * @param search An Object with either a `user_id` or a `username`
	 * @param mode The User's gamemode; 0: osu!, 1: taiko, 2: ctb, 3: mania
	 * @returns A Promise with a User found with the search
	 */
	async getUser(search: {user_id?: number, username?: string} | User, mode: number): Promise<User> {
		if (!search.user_id && !search.username) {return new User({})}
		let type = search.user_id ? "id" : "string"
	
		let response = await this.request("get_user", `u=${type == "id" ? search.user_id : search.username}&type=${type}&m=${mode}`)
		return new User(response ? response[0] : {})
	}

	/**
	 * @param user An Object with either a `user_id` or a `username`
	 * @param mode The User's gamemode; 0: osu!, 1: taiko, 2: ctb, 3: mania
	 * @param plays The User's top pp plays or the User's plays within the last 24 hours
	 * @param limit The maximum number of scores to get, cannot exceed 100
	 * @returns A Promise with an array of Scores set by the User in a specific mode
	 */
	async getUserScores(user: {user_id?: number, username?: string} | User, mode: number, plays: "best" | "recent", limit?: number): Promise<Score[]> {
		let scores: Score[] = []
	
		if (!user.user_id && !user.username) {return scores}
		let type = user.user_id ? "id" : "string"
	
		let response = await this.request(`get_user_${plays}`, `u=${type == "id" ? user.user_id : user.username}&type=${type}&m=${mode}&limit=${limit || 5}`)
		if (response) response.forEach((s: Object) => scores.push(new Score(s)))
	
		return scores
	}

	/**
	 * @param diff_id The ID of the difficulty/beatmap of the beatmapset
	 * @param mods A number representing the mods to apply
	 * @returns A Promise with a Beatmap
	 */
	async getBeatmap(diff_id: number, mods: Mods | ModsShort): Promise<Beatmap> {
		let success: boolean
		let beatmap: Beatmap
	
		let unsupported_mods = [8, 32] // API returns some stuff as 0/null if any of those mods are included
		unsupported_mods.forEach((mod) => getMods(mods, "short").includes(ModsShort[mod]) ? mods -= mod : mods -= 0)
	
		try {
			let response = await this.request("get_beatmaps", `b=${diff_id}&mods=${mods}`)
			response = response[0]
			if (getMods(mods, "short").includes("DT")) {
				response.total_length /= (3/2)
				response.hit_length /= (3/2)
				response.bpm *= (3/2)
			}
			beatmap = new Beatmap(response)
			success = true
		}
		catch (e) {
			console.log(e)
			success = false
		}
	
		return success ? beatmap! : new Beatmap({})
	}

	/**
	 * @param diff_id The ID of the difficulty/beatmap of the beatmapset
	 * @param mode The Scores' gamemode; 0: osu!, 1: taiko, 2: ctb, 3: mania
	 * @param user The Scores' user, which is an Object with either a `user_id` or a `username`
	 * @param mods A number representing the mods to apply
	 * @param limit The maximum number of scores to get, cannot exceed 100
	 * @returns A Promise with an array of Scores set on a beatmap
	 */
	async getBeatmapScores(diff_id: number, mode: number, user?: {user_id?: number, username?: string} | User, mods?: ModsShort, limit?: number): Promise<Score[]> {
		let scores: Score[] = []
	
		if (user && !user.user_id && !user.username) {return scores}
		let type = user ? user.user_id ? "id" : user.username ? "string" : false : false
	
		let response = await this.request("get_scores", `b=${diff_id}&m=${mode}${type ? type == "id" ? "&u="+user!.user_id : "&u="+user!.username : ""}
		${mods ? "&mods="+mods : ""}${type ? "&type="+type : ""}&limit=${limit || 5}`)
		if (response) response.forEach((s: Object) => scores.push(new Score(s)))
	
		return scores
	}

	/**
	 * @param id The ID of the match
	 * @returns A Promise with a Match
	 */
	async getMatch(id: number): Promise<Match> {
		let response = await this.request("get_match", `mp=${id}`)
		return new Match(response ? response : {})
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
