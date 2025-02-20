import { Beatmap } from "./beatmap.js"
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
