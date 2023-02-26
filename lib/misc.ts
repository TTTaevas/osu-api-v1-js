import { Beatmap } from "./beatmap"
import { Mods } from "./mods"

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
 * This function returns a Beatmap with properties adjusted to the chosen Mods without making a request to the servers. The properties are namely: 
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
