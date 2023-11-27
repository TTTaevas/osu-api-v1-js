/**
 * So you can do something like `Mods.HIDDEN + Mods["HARDROCK"]` instead of thinking about the bitwise number
 * (https://github.com/ppy/osu-api/wiki#mods)
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

/**
 * API returns the SR (and pp stuff) of a Beatmap as 0/null if any of those mods are included
 */
export const unsupported_mods = [
	Mods.NOFAIL, Mods.HIDDEN, Mods.SPUNOUT, Mods.FADEIN, Mods.NIGHTCORE,
	Mods.SUDDENDEATH, Mods.PERFECT,
	Mods.RELAX, Mods.AUTOPLAY, Mods.AUTOPILOT, Mods.CINEMA,
	Mods.RANDOM, Mods.TARGET, Mods.SCOREV2, Mods.MIRROR,
	Mods.KEY1, Mods.KEY2, Mods.KEY3, Mods.KEY4, Mods.KEY5, Mods.KEY6, Mods.KEY7, Mods.KEY8, Mods.KEY9, Mods.KEYCOOP,
]
