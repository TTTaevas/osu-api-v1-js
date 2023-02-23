import { getMods, Mods } from "./index"

/**
 * For the `approved` of a `Beatmap` (for example, `Categories[beatmap.approved]` would return "RANKED" if 1) https://osu.ppy.sh/wiki/en/Beatmap/Category
 */
export enum Categories {
	GRAVEYARD = -2,
	WIP  			= -1,
	PENDING 	= 0,
	RANKED  	= 1,
	APPROVED 	= 2,
	QUALIFIED = 3,
}

/**
 * For the `genre_id` of a `Beatmap` (for example, `Genres[beatmap.genre_id]` would return "NOVELTY" if 7)
 */
export enum Genres {
	ANY 				 = 0,
	UNSPECIFIED  = 1,
	"VIDEO GAME" = 2,
	ANIME 			 = 3,
	ROCK 				 = 4,
	POP 				 = 5,
	OTHER 			 = 6,
	NOVELTY 		 = 7,
	"" 					 = 8,
	"HIP HOP" 	 = 9,
	ELECTRONIC 	 = 10,
	METAL 			 = 11,
	CLASSICAL 	 = 12,
	FOLK 				 = 13,
	JAZZ 				 = 14,
}

/**
 * For the `language_id` of a `Beatmap` (for example, `Languages[beatmap.language_id]` would return "FRENCH" if 7)
 */
export enum Languages {
	ANY 				 = 0,
	UNSPECIFIED  = 1,
	ENGLISH 		 = 2,
	JAPANESE 		 = 3,
	CHINESE 		 = 4,
	INSTRUMENTAL = 5,
	KOREAN 			 = 6,
	FRENCH 			 = 7,
	GERMAN 			 = 8,
	SWEDISH 		 = 9,
	SPANISH 		 = 10,
	ITALIAN 		 = 11,
	RUSSIAN 		 = 12,
	POLISH 			 = 13,
	OTHER 			 = 14,
}

export interface Beatmap {
	beatmapset_id: number
	beatmap_id: number
	/**
	 * Also known as the id of the category the beatmap is in, for example it'd be 1 if it was ranked
	 */
	approved: number
	/**
	 * In seconds. Feel free to use the `getLength` function attached to this object to have the length in a "m:ss" format!
	 */
	total_length: number
	/**
	 * In seconds. Feel free to use the `getLength` function attached to this object to have the length in a "m:ss" format!
	 */
	hit_length: number
	/**
	 * The name of the difficulty/beatmap (for example, "Mirash's Insane")
	 */
	version: string
	/**
	 * md5 hash of the beatmap
	 */
	file_md5: string
	/**
	 * Circle Size https://osu.ppy.sh/wiki/en/Beatmap/Circle_size
	 */
	diff_size: number
	/**
	 * Overall Difficulty https://osu.ppy.sh/wiki/en/Beatmap/Overall_difficulty
	 */
	diff_overall: number
	/**
	 * Approach Rate https://osu.ppy.sh/wiki/en/Beatmap/Approach_rate
	 */
	diff_approach: number
	/**
	 * Health Drain https://osu.ppy.sh/wiki/en/Gameplay/Health
	 */
	diff_drain: number
	/**
	 * The number representing the Gamemode for which the API responsed (it may not be the requested Gamemode if the beatmap is exclusive to Taiko/CTB/Mania)
	 */
	mode: number
	count_normal: number
	count_slider: number
	count_spinner: number
	submit_date: Date
	approved_date: Date
	last_update: Date
	/**
	 * As it's shown on the website (so it's romaji if japanese name)
	 */
	artist: string
	/**
	 * As it's shown when you start playing the beatmap (so it's kana/kanji if japanese name)
	 */
	artist_unicode: string
	/**
	 * As it's shown on the website (so it's romaji if japanese name)
	 */
	title: string
	/**
	 * As it's shown when you start playing the beatmap (so it's kana/kanji if japanese name)
	 */
	title_unicode: string
	creator: string
	creator_id: number
	bpm: number
	/**
	 * Is 0 if no source
	 */
	source: string | 0
	tags: string
	genre_id: number
	language_id: number
	favourite_count: number
	rating: number
	storyboard: boolean
	video: boolean
	/**
	 * If the map can **not** be downloaded from the website
	 */
	download_unavailable: boolean
	/**
	 * If the map can **not** be downloaded with its audio file
	 */
	audio_unavailable: boolean
	playcount: number
	passcount: number
	/**
	 * Undocumented! Is null if the beatmap(set) is not featured in any beatmap pack https://osu.ppy.sh/beatmaps/packs
	 */
	packs: string | null
	max_combo: number
	/**
	 * Is null if mode is 1 or 3 (taiko or mania)
	 */
	diff_aim: number | null
	/**
	 * Is null if mode is 1, 2, or 3 (taiko, ctb, or mania)
	 */
	diff_speed: number | null
	/**
	 * Star Rating https://osu.ppy.sh/wiki/en/Beatmap/Star_rating
	 */
	difficultyrating: number
}

export const adjustBeatmapStatsToMods: (beatmap: Beatmap, mods: Mods) => Beatmap = (beatmap: Beatmap, mods: Mods) => {
	beatmap = Object.assign({}, beatmap) // Do not change the original Beatmap outside this function
	const arr = getMods(mods)
	const convertARtoMS = (ar: number) => {
		ar *= 10
		let ms = 1800 // AR 0's ms
		for (let i = 0; i < ar; i++) {ms -= i >= 50 ? 15 : 12}
		return ms
	}

	if (arr.includes("Easy")) {
		beatmap.diff_size /= 2
		beatmap.diff_approach /= 2
		beatmap.diff_overall /= 2
		beatmap.diff_drain /= 2
	}

	if (arr.includes("HardRock")) {
		beatmap.diff_size = Math.min(10, beatmap.diff_size * 1.3)
		beatmap.diff_approach = Math.min(10, beatmap.diff_approach * 1.4)
		beatmap.diff_overall = Math.min(10, beatmap.diff_overall * 1.4)
		beatmap.diff_drain = Math.min(10, beatmap.diff_drain * 1.4)
	}

	if (arr.includes("DoubleTime") || arr.includes("Nightcore")) {
		beatmap.total_length /= 1.5
		beatmap.hit_length /= 1.5
		beatmap.bpm *= 1.5
		beatmap.diff_approach = (1950 - (convertARtoMS(beatmap.diff_approach) / 1.5)) / 150
		beatmap.diff_overall = (80 - ((80 - 6 * beatmap.diff_overall) / 1.5)) / 6
	}

	if (arr.includes("HalfTime")) {
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
