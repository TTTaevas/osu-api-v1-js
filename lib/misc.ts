import { Beatmap } from "./beatmap.js"
import { Mods } from "./mods.js"
import { User } from "./user.js"

// ENUMS COMMON TO MULTIPLE STUFF

/**
 * https://osu.ppy.sh/wiki/en/Game_mode
 */
export enum Gamemodes {
	/**
	 * https://osu.ppy.sh/wiki/en/Game_mode/osu%21
	 */
	OSU 	= 0,
	/**
	 * https://osu.ppy.sh/wiki/en/Game_mode/osu%21taiko
	 */
	TAIKO = 1,
	/**
	 * https://osu.ppy.sh/wiki/en/Game_mode/osu%21catch
	 */
	CTB 	= 2,
	/**
	 * https://osu.ppy.sh/wiki/en/Game_mode/osu%21mania
	 */
	MANIA = 3,
}


// FUNCTIONS (no other file should hold exportable functions)

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
 * This object is a collection of functions that can be useful if you're looking to have an image URL
 * or an URL that interacts directly with the game client!
 */
export const getURL = {
	/**
	 * @param beatmap An Object with the `beatmapset_id` of the Beatmap
	 * @returns The URL of a 900x250 JPEG image
	 */
	beatmapCoverImage: (beatmap: {beatmapset_id: number} | Beatmap): string => `https://assets.ppy.sh/beatmaps/${beatmap.beatmapset_id}/covers/cover.jpg`,
	/**
	 * @param beatmap An Object with the `beatmapset_id` of the Beatmap
	 * @returns The URL of a 160x120 JPEG image
	 */
	beatmapCoverThumbnail: (beatmap: {beatmapset_id: number} | Beatmap): string => `https://b.ppy.sh/thumb/${beatmap.beatmapset_id}l.jpg`,

	/**
	 * @param user An Object with the `user_id` of the User
	 * @returns The URL of a JPEG image of variable proportions (max and ideally 256x256)
	 */
	userProfilePicture: (user: {user_id: number} | User): string => `https://s.ppy.sh/a/${user.user_id}`,

	/**
	 * The URLs in that Object do not use HTTPS, and instead (try to) open the osu! client in order to do something
	 */
	toOpen: {
		/**
		 * @param id NOT THE MATCH ID, it's the ID you get when joining the match through IRC, after `multiplayer game #`
		 * @param password The password of the room
		 * @returns The URL that may be used by someone to open the (default) osu! client and attempt to join the match
		 */
		match: (id: number, password?: string) => `osu://mp/${id}${password ? "/" + password : ""}`,
		/**
		 * @param timeline The things you can click on on the discussion page of beatmaps (like `01:01:343 (1,1)`)
		 * @returns The URL that may be used by someone to select something when inside the beatmap editor
		 */
		editor: (timeline: string) => `osu://edit/${timeline}`,
		/**
		 * @param channel The name of a channel (like `french`)
		 * @returns The URL that may be used by someone to attempt to open a channel
		 */
		channel: (channel: string) => `osu://chan/${channel.startsWith("#") ? "" : "#"}${channel}`,
		/**
		 * @param beatmap An Object with the ID of a Beatmap
		 * @returns The URL that may be used by someone to attempt to open a beatmap through osu!direct
		 */
		beatmap: (beatmap: {beatmap_id: number} | Beatmap) => `osu://b/${beatmap.beatmap_id}`,
		/**
		 * @param beatmap An Object with the set ID of a Beatmap
		 * @returns The URL that may be used by someone to attempt to open a beatmapset through osu!direct
		 */
		beatmapset: (beatmap: {beatmapset_id: number} | Beatmap) => `osu://s/${beatmap.beatmapset_id}`,
		/**
		 * @param user An Object with the ID of a User
		 * @returns The URL that may be used by someone to attempt to spectate someone in the game client
		 */
		spectateUser: (user: {user_id: number} | User) => `osu://spectate/${user}`
	}
}

/**
 * This function returns a Beatmap with properties adjusted to the chosen Mods without making a request to the servers.
 * 
 * The properties are namely: 
 * `total_length`, `hit_length`, `bpm`, `diff_size`, `diff_approach`, `diff_overall`, `diff_drain`
 * @remarks NOTE THAT THIS FUNCTION DOESN'T ADJUST `diff_aim`, `diff_speed` OR `difficultyrating`, USE `getBeatmap()` FOR THAT
 * @param beatmap The Beatmap to adapt
 * @param mods The Mods to which the Beatmap will be adapted
 * @returns The Beatmap, but adjusted to the Mods
 */
export const adjustBeatmapStatsToMods: (beatmap: Beatmap, mods: Mods) => Beatmap = (beatmap: Beatmap, mods: Mods) => {
	beatmap = Object.assign({}, beatmap) // Do not change the original Beatmap outside this function
	const arr = getMods(mods)
	const convertARtoMS = (ar: number) => {
		ar *= 10
		let ms = 1800 // AR 0's ms
		for (let i = 0; i < ar; i++) {ms -= i >= 50 ? 15 : 12}
		return ms
	}

	if (arr.includes(Mods[Mods.EASY])) {
		beatmap.diff_size /= 2
		beatmap.diff_approach /= 2
		beatmap.diff_overall /= 2
		beatmap.diff_drain /= 2
	}

	if (arr.includes(Mods[Mods.HARDROCK])) {
		beatmap.diff_size = Math.min(10, beatmap.diff_size * 1.3)
		beatmap.diff_approach = Math.min(10, beatmap.diff_approach * 1.4)
		beatmap.diff_overall = Math.min(10, beatmap.diff_overall * 1.4)
		beatmap.diff_drain = Math.min(10, beatmap.diff_drain * 1.4)
	}

	if (arr.includes(Mods[Mods.DOUBLETIME]) || arr.includes(Mods[Mods.NIGHTCORE])) {
		beatmap.total_length /= 1.5
		beatmap.hit_length /= 1.5
		beatmap.bpm *= 1.5
		beatmap.diff_approach = (1950 - (convertARtoMS(beatmap.diff_approach) / 1.5)) / 150
		beatmap.diff_overall = (80 - ((80 - 6 * beatmap.diff_overall) / 1.5)) / 6
	}

	if (arr.includes(Mods[Mods.HALFTIME])) {
		beatmap.total_length /= 0.75
		beatmap.hit_length /= 0.75
		beatmap.bpm *= 0.75
		beatmap.diff_approach = beatmap.diff_approach > 7 ? 
		(1950 - (convertARtoMS(beatmap.diff_approach) / 0.75)) / 150 :
		(1800 - (convertARtoMS(beatmap.diff_approach) / 0.75)) / 120 // :skull:
		beatmap.diff_overall = (80 - ((80 - 6 * beatmap.diff_overall) / 0.75)) / 6
	}

	return beatmap
}
