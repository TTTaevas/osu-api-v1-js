import { Beatmap } from "./beatmap.js"

/**
 * It's a bitwise enum, works in such a way that `1` would be `NOFAIL` while `10` would be `HIDDEN + EASY`
 * https://github.com/ppy/osu-api/wiki#mods
 */
export enum Mods {
	NONE           = 0,
	NOFAIL         = 1,
	EASY           = 2,
	TOUCHDEVICE    = 4,
	HIDDEN         = 8,
	HARDROCK       = 16,
	SUDDENDEATH    = 32,
	DOUBLETIME     = 64,
	RELAX          = 128,
	HALFTIME       = 256,
	/**
	 * @remarks From osu!api wiki: Only set along with DoubleTime. i.e: NC only gives 576
	 */
	NIGHTCORE      = 512,
	FLASHLIGHT     = 1024,
	AUTOPLAY       = 2048,
	SPUNOUT        = 4096,
	/**
	 * It's called `Relax2` in the osu!api wiki
	 */
	AUTOPILOT      = 8192,
	/**
	 * @remarks From osu!api wiki: Only set along with SuddenDeath. i.e: PF only gives 16416  
	 */
	PERFECT        = 16384,
	KEY4           = 32768,
	KEY5           = 65536,
	KEY6           = 131072,
	KEY7           = 262144,
	KEY8           = 524288,
	FADEIN         = 1048576,
	RANDOM         = 2097152,
	CINEMA         = 4194304,
	TARGET         = 8388608,
	KEY9           = 16777216,
	KEYCOOP        = 33554432,
	KEY1           = 67108864,
	KEY3           = 134217728,
	KEY2           = 268435456,
	SCOREV2        = 536870912,
	MIRROR         = 1073741824,
}

export namespace Mods {
	/**
	 * API returns the SR (and pp stuff) of a Beatmap as 0/null if any of those mods are included
	 * @remarks `Mods.removeUnsupported` takes care of automatically removing/replacing them
	 */
	export const unsupported = [
		Mods.NOFAIL, Mods.HIDDEN, Mods.SPUNOUT, Mods.FADEIN, Mods.NIGHTCORE,
		Mods.SUDDENDEATH, Mods.PERFECT,
		Mods.RELAX, Mods.AUTOPLAY, Mods.AUTOPILOT, Mods.CINEMA,
		Mods.RANDOM, Mods.TARGET, Mods.SCOREV2, Mods.MIRROR,
		Mods.KEY1, Mods.KEY2, Mods.KEY3, Mods.KEY4, Mods.KEY5, Mods.KEY6, Mods.KEY7, Mods.KEY8, Mods.KEY9, Mods.KEYCOOP,
	]

	/**
	 * This function is called automatically for `getBeatmap` and `getBeatmaps`, you may use it yourself if it is necessary for anything else
	 * @param mods An array of `Mods` from which the so-called "unsupported mods" will be removed
	 * @returns `mods` without the unsupported mods, and with `Mods.DOUBLETIME` if `Mods.NIGHTCORE` was in there
	 */
	export function removeUnsupported(mods: Mods[]): Mods[] {
		if (mods.includes(Mods.NIGHTCORE) === true && mods.includes(Mods.DOUBLETIME) === false) {
			mods.push(Mods.DOUBLETIME)
		}
		unsupported.forEach((m) => {
			while (mods.indexOf(m) !== -1) {
				mods.splice(mods.indexOf(m), 1)
			}
		})
		return mods
	}

	/**
	 * This function turns a number that represents `Mods` into an array of `Mods[]`, which makes it useful to translate responses from the API server
	 * @param mods The number representing the `Mods`, usually from the response received after a request to the API server
	 * @returns An array with all the appropriate `Mods`
	 */
	export function bitsToArray(mods: Mods): Mods[] {
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
	 * @param mods An array of `Mods` that will be turned into bits
	 * @returns A number representing the `Mods`, or `null` if the array is empty
	 */
	export function arrayToBits(mods: Mods[]): Mods | null {
		return !mods.length ? null : mods.reduce((a, b) => a + b)
	}

	/**
	 * This function returns a Beatmap with properties adjusted to the chosen Mods without making a request to the servers
	 *
	 * The properties are namely:
	 * `total_length`, `hit_length`, `bpm`, `diff_size`, `diff_approach`, `diff_overall`, `diff_drain`
	 * @remarks Note that this function doesn't adjust `diff_aim`, `diff_speed` or `difficultyrating`!
	 * Making a request using `getBeatmap()` adjusts everything, if you need to adjust any of these three properties
	 * @param beatmap The Beatmap to adapt
	 * @param mods The Mods to which the Beatmap will be adapted
	 * @returns The Beatmap, but adjusted to the Mods
	 */
	export const adjustBeatmapStats = (beatmap: Beatmap, mods: Mods | Mods[]): Beatmap => {
		beatmap = Object.assign({}, beatmap) // Do not change the original Beatmap outside this function
		if (!Array.isArray(mods)) {
			mods = bitsToArray(mods)
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
}
