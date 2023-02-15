import axios, { AxiosError, AxiosResponse } from "axios"
import { User } from "./user"
import { Score } from "./score"
import { Beatmap } from "./beatmap"
import { Match } from "./match"
import { Mods, ModsShort } from "./mods"

export class API {
	key: string
	constructor(key: string) {
		this.key = key
	}

	async _request(type: string, params: string, number_try?: number): Promise<AxiosResponse["data"] | false> {
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
					console.log("osu!api v1 ->", error.response.statusText, error.response.status, {type, params})
				} else if (error.request) {
					console.log("osu!api v1 ->", "Request made but server did not respond", {number_try}, {type, params})
					to_retry = true
				} else { // Something happened in setting up the request that triggered an error, I think
					console.error(error)
				}
			} else {
				console.error(error)
			}
		})
		
		if (resp) {
			console.log("osu!api v1 ->", resp.statusText, resp.status, {type, params})
			return resp.data
		} else {
			if (to_retry && number_try < 5) {
				return await this._request(type, params, number_try + 1)
			} else {
				return false
			}
		}
	}

	async getUser(search: {id?: number, username?: string}, mode: number): Promise<User> {
		if (!search.id && !search.username) {return new User({})}
		let type = search.id ? "id" : "string"
	
		let response = await this._request("get_user", `u=${type == "id" ? search.id : search.username}&type=${type}&m=${mode}`)
		return new User(response ? response[0] : {})
	}

	async getUserScores(user: {user_id?: number, username?: string} | User, plays: "best" | "recent", mode: number, limit?: number): Promise<Score[]> {
		let scores: Score[] = []
	
		if (!user.user_id && !user.username) {return scores}
		let type = user.user_id ? "id" : "string"
	
		let response = await this._request(`get_user_${plays}`, `u=${type == "id" ? user.user_id : user.username}&type=${type}&m=${mode}&limit=${limit || 5}`)
		if (response) response.forEach((s: Object) => scores.push(new Score(s)))
	
		return scores
	}

	async getBeatmap(diff_id: number, mods: Mods | ModsShort): Promise<Beatmap> {
		let success: boolean
		let beatmap: Beatmap
	
		let unsupported_mods = [8, 32] // API returns some stuff as 0/null if any of those mods are included
		unsupported_mods.forEach((mod) => getMods(mods, "short").includes(ModsShort[mod]) ? mods -= mod : mods -= 0)
	
		try {
			let response = await this._request("get_beatmaps", `b=${diff_id}&mods=${mods}`)
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

	async getBeatmapScores(beatmap_id: number, mode: number, user?: {user_id?: number, username?: string} | User, mods?: ModsShort, limit?: number): Promise<Score[]> {
		let scores: Score[] = []
	
		if (user && !user.user_id && !user.username) {return scores}
		let type = user ? user.user_id ? "id" : user.username ? "string" : false : false
	
		let response = await this._request("get_scores", `b=${beatmap_id}&m=${mode}${type ? type == "id" ? "&u="+user!.user_id : "&u="+user!.username : ""}
		${mods ? "&mods="+mods : ""}${type ? "&type="+type : ""}&limit=${limit || 5}`)
		if (response) response.forEach((s: Object) => scores.push(new Score(s)))
	
		return scores
	}

	async getMatch(id: number): Promise<Match> {
		let response = await this._request("get_match", `mp=${id}`)
		return new Match(response ? response : {})
	}
}

export function getMode(id: number): string {
	return ["osu!", "taiko", "catch the beat", "osu!mania"][id]
}

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
