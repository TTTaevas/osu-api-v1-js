import { Beatmap } from "./beatmap.js"
import { Mods, unsupported_mods } from "./mods.js"
import { User } from "./user.js"

// ENUMS COMMON TO MULTIPLE STUFF

/**
 * https://osu.ppy.sh/wiki/en/Game_mode
 */
export enum Gamemodes {
	/**
	 * https://osu.ppy.sh/wiki/en/Game_mode/osu%21
	 */
	OSU		= 0,
	/**
	 * https://osu.ppy.sh/wiki/en/Game_mode/osu%21taiko
	 */
	TAIKO	= 1,
	/**
	 * https://osu.ppy.sh/wiki/en/Game_mode/osu%21catch
	 */
	CTB		= 2,
	/**
	 * https://osu.ppy.sh/wiki/en/Game_mode/osu%21mania
	 */
	MANIA	= 3,
}


// FUNCTIONS (no other file should hold exportable functions)

/**
 * This function turns a number that represents `Mods` into an array of `Mods[]`, which makes it useful to translate responses from the API server
 * @param mods The number representing the `Mods`, usually from the response received after a request to the API server
 * @returns An array with all the appropriate `Mods`
 */
export function modsBitsToArray(mods: Mods): Mods[] {
	const arr: Mods[] = []
	for (let bit = 1; bit != 0; bit <<= 1) {
		if ((mods & bit) != 0 && bit in Mods) {
			arr.push(bit)
		}
	}
	return arr
}

/**
 * This function turns an array of `Mods` into a number that the API server can understand
 * @remarks One useful thing about it is the distinction made between `[]` (lack of mods) and `[Mods.NOMOD]`; specifying the nomod mod can alter requests
 * @param mods An array of `Mods`
 * @returns A number representing the `Mods`, or `null` if the array is empty
 */
export function modsArrayToBits(mods: Mods[]): Mods | null {
	return !mods.length ? null : mods.reduce((a, b) => a + b)
}

/**
 * This function is called automatically for `getBeatmap` and `getBeatmaps`, you may use it yourself if it is necessary for anything else
 * @param mods An array of `Mods`
 * @returns `mods` without the unsupported mods, and with `Mods.DOUBLETIME` if `Mods.NIGHTCORE` was in there
 */
export function removeUnsupportedMods(mods: Mods[]): Mods[] {
	if (mods.includes(Mods.NIGHTCORE) === true && mods.includes(Mods.DOUBLETIME) === false) {
		mods.push(Mods.DOUBLETIME)
	}
	unsupported_mods.forEach((unsupported_mod) => {
		while (mods.indexOf(unsupported_mod) !== -1) {
			mods.splice(mods.indexOf(unsupported_mod), 1)
		}
	})
	return mods
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
 * or a URL that interacts directly with the game client!
 */
export const getURL = {
	/**
	 * @param beatmap An Object with the `beatmapset_id` of the Beatmap
	 * @param server (defaults to "https://assets.ppy.sh") The server hosting the file
	 * @returns The URL of a 900x250 JPEG image
	 */
	beatmapCoverImage: (beatmap: {beatmapset_id: Beatmap["beatmapset_id"]} | Beatmap, server: string = "https://assets.ppy.sh"): string => {
		return `${server}/beatmaps/${beatmap.beatmapset_id}/covers/cover.jpg`
	},
	/**
	 * @param beatmap An Object with the `beatmapset_id` of the Beatmap
	 * @param server (defaults to "https://b.ppy.sh") The server hosting the file
	 * @returns The URL of a 160x120 JPEG image
	 */
	beatmapCoverThumbnail: (beatmap: {beatmapset_id: Beatmap["beatmapset_id"]} | Beatmap, server: string = "https://b.ppy.sh"): string => {
		return `${server}/thumb/${beatmap.beatmapset_id}l.jpg`
	},
	/**
	 * @param user An Object with the `user_id` of the User
	 * @param server (defaults to "https://a.ppy.sh") The server hosting the file
	 * @returns The URL of a JPEG image of variable proportions (max and ideally 256x256)
	 */
	userProfilePicture: (user: {user_id: User["user_id"]} | User, server: string = "https://a.ppy.sh"): string => {
		return `${server}/${user.user_id}`
	},

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
		beatmap: (beatmap: {beatmap_id: Beatmap["beatmap_id"]} | Beatmap) => `osu://b/${beatmap.beatmap_id}`,
		/**
		 * @param beatmap An Object with the set ID of a Beatmap
		 * @returns The URL that may be used by someone to attempt to open a beatmapset through osu!direct
		 */
		beatmapset: (beatmap: {beatmapset_id: Beatmap["beatmapset_id"]} | Beatmap) => `osu://s/${beatmap.beatmapset_id}`,
		/**
		 * @param user An Object with the ID of a User
		 * @returns The URL that may be used by someone to attempt to spectate someone in the game client
		 */
		spectateUser: (user: {user_id: User["user_id"]} | User) => `osu://spectate/${user}`
	}
}

/**
 * This function returns a Beatmap with properties adjusted to the chosen Mods without making a request to the servers.
 * 
 * The properties are namely: 
 * `total_length`, `hit_length`, `bpm`, `diff_size`, `diff_approach`, `diff_overall`, `diff_drain`
 * @remarks Note that this function doesn't adjust `diff_aim`, `diff_speed` or `difficultyrating`!
 * Making a request using `getBeatmap()` adjusts everything, if you need to adjust any of these three properties
 * @param beatmap The Beatmap to adapt
 * @param mods The Mods to which the Beatmap will be adapted
 * @returns The Beatmap, but adjusted to the Mods
 */
export const adjustBeatmapStatsToMods = (beatmap: Beatmap, mods: Mods | Mods[]): Beatmap => {
	beatmap = Object.assign({}, beatmap) // Do not change the original Beatmap outside this function
	if (!Array.isArray(mods)) {
		mods = modsBitsToArray(mods)
	}

	const convertARtoMS = (ar: number) => {
		ar *= 10
		let ms = 1800 // AR 0's ms
		for (let i = 0; i < ar; i++) {ms -= i >= 50 ? 15 : 12}
		return ms
	}

	if (mods.includes(Mods.EASY)) {
		beatmap.diff_size /= 2
		beatmap.diff_approach /= 2
		beatmap.diff_overall /= 2
		beatmap.diff_drain /= 2
	}

	if (mods.includes(Mods.HARDROCK)) {
		beatmap.diff_size = Math.min(10, beatmap.diff_size * 1.3)
		beatmap.diff_approach = Math.min(10, beatmap.diff_approach * 1.4)
		beatmap.diff_overall = Math.min(10, beatmap.diff_overall * 1.4)
		beatmap.diff_drain = Math.min(10, beatmap.diff_drain * 1.4)
	}

	if (mods.includes(Mods.DOUBLETIME) || mods.includes(Mods.NIGHTCORE)) {
		beatmap.total_length /= 1.5
		beatmap.hit_length /= 1.5
		beatmap.bpm *= 1.5
		beatmap.diff_approach = (1950 - (convertARtoMS(beatmap.diff_approach) / 1.5)) / 150
		beatmap.diff_overall = (80 - ((80 - 6 * beatmap.diff_overall) / 1.5)) / 6
	}

	if (mods.includes(Mods.HALFTIME)) {
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
