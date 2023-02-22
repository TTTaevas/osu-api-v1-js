export enum Mods { // Directly taken from https://github.com/ppy/osu-api/wiki
	None           = 0,
	NoFail         = 1,
	Easy           = 2,
	TouchDevice    = 4,
	Hidden         = 8,
	HardRock       = 16,
	SuddenDeath    = 32,
	DoubleTime     = 64,
	Relax          = 128,
	HalfTime       = 256,
	Nightcore      = 512, // Only set along with DoubleTime. i.e: NC only gives 576
	Flashlight     = 1024,
	Autoplay       = 2048,
	SpunOut        = 4096,
	Autopilot      = 8192, // Is "Relax2" in documentation
	Perfect        = 16384, // Only set along with SuddenDeath. i.e: PF only gives 16416  
	Key4           = 32768,
	Key5           = 65536,
	Key6           = 131072,
	Key7           = 262144,
	Key8           = 524288,
	FadeIn         = 1048576,
	Random         = 2097152,
	Cinema         = 4194304,
	Target         = 8388608,
	Key9           = 16777216,
	KeyCoop        = 33554432,
	Key1           = 67108864,
	Key3           = 134217728,
	Key2           = 268435456,
	ScoreV2        = 536870912,
	Mirror         = 1073741824,
	// KeyMod = Key1 | Key2 | Key3 | Key4 | Key5 | Key6 | Key7 | Key8 | Key9 | KeyCoop,
	// FreeModAllowed = NoFail | Easy | Hidden | HardRock | SuddenDeath | Flashlight | FadeIn | Relax | Autopilot | SpunOut | KeyMod,
	// ScoreIncreaseMods = Hidden | HardRock | DoubleTime | Flashlight | FadeIn
}

/**
 * API returns the SR (and pp stuff) of a Beatmap as 0/null if any of those mods are included.
 * Nightcore would also be featured in this Array, but getBeatmap() circumvents that issue by converting it to DoubleTime!
 */
export const unsupported_mods = [
	Mods.NoFail, Mods.Hidden, Mods.SpunOut, Mods.FadeIn,
	Mods.SuddenDeath, Mods.Perfect,
	Mods.Relax, Mods.Autoplay, Mods.Autopilot, Mods.Cinema,
	Mods.Random, Mods.Target, Mods.ScoreV2, Mods.Mirror,
	Mods.Key1, Mods.Key2, Mods.Key3, Mods.Key4, Mods.Key5, Mods.Key6, Mods.Key7, Mods.Key8, Mods.Key9, Mods.KeyCoop,
]
