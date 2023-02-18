import { getMods } from "."
import { Mods } from "./mods"

export enum Categories {
	graveyard = -2,
	WIP  			= -1,
	pending 	= 0,
	ranked  	= 1,
	approved 	= 2,
	qualified = 3,
}

export enum Genres {
	any 				 = 0,
	unspecified  = 1,
	"video game" = 2,
	anime 			 = 3,
	rock 				 = 4,
	pop 				 = 5,
	other 			 = 6,
	novelty 		 = 7,
	"" 					 = 8,
	"hip hop" 	 = 9,
	electronic 	 = 10,
	metal 			 = 11,
	classical 	 = 12,
	folk 				 = 13,
	jazz 				 = 14,
}

export enum Languages {
	any 				 = 0,
	unspecified  = 1,
	english 		 = 2,
	japanese 		 = 3,
	chinese 		 = 4,
	instrumental = 5,
	korean 			 = 6,
	french 			 = 7,
	german 			 = 8,
	swedish 		 = 9,
	spanish 		 = 10,
	italian 		 = 11,
	russian 		 = 12,
	polish 			 = 13,
	other 			 = 14,
}

export interface Beatmap {
	beatmapset_id: number
	beatmap_id: number
	approved: number
	total_length: number
	hit_length: number
	version: string
	file_md5: string
	diff_size: number
	diff_overall: number
	diff_approach: number
	diff_drain: number
	mode: number
	count_normal: number
	count_slider: number
	count_spinner: number
	submit_date: Date
	approved_date: Date
	last_update: Date
	artist: string
	artist_unicode: string | null
	title: string
	title_unicode: string | null
	creator: string
	creator_id: number
	bpm: number
	source: string
	tags: string
	genre_id: number
	language_id: number
	favourite_count: number
	rating: number
	storyboard: boolean
	video: boolean
	download_unavailable: boolean
	audio_unavailable: boolean
	playcount: number
	passcount: number
	packs: string | null // this isn't even documented lol
	max_combo: number
	diff_aim: number
	diff_speed: number
	difficultyrating: number
	getLength: Function
	getCategory: Function
	getGenre: Function
	getLanguage: Function
}

export const adjustBeatmapStatsToMods: (beatmap: Beatmap, mods: Mods) => Beatmap = (beatmap: Beatmap, mods: Mods) => {
	const arr = getMods(mods, "short")
	const convertARtoMS = (ar: number) => {
		ar *= 10
		let ms = 1800 // AR 0's ms
		for (let i = 0; i < ar; i++) {ms -= i >= 50 ? 15 : 12}
		return ms
	}

	if (arr.includes("EZ")) {
		beatmap.diff_size /= 2
		beatmap.diff_approach /= 2
		beatmap.diff_overall /= 2
		beatmap.diff_drain /= 2
	}

	if (arr.includes("HR")) {
		beatmap.diff_size = Math.min(10, beatmap.diff_size * 1.3)
		beatmap.diff_approach = Math.min(10, beatmap.diff_approach * 1.4)
		beatmap.diff_overall = Math.min(10, beatmap.diff_overall * 1.4)
		beatmap.diff_drain = Math.min(10, beatmap.diff_drain * 1.4)
	}

	if (arr.includes("DT")) {
		beatmap.total_length /= 1.5
		beatmap.hit_length /= 1.5
		beatmap.bpm *= 1.5
		beatmap.diff_approach = (1950 - (convertARtoMS(beatmap.diff_approach) / 1.5)) / 150
		beatmap.diff_overall = (80 - ((80 - 6 * beatmap.diff_overall) / 1.5)) / 6
	}

	if (arr.includes("HT")) {
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
