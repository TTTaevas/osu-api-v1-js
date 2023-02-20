export interface Score {
	beatmap_id: number
	score_id: number
	score: number
	maxcombo: number
	count50: number
	count100: number
	count300: number
	countmiss: number
	countkatu: number
	countgeki: number
	perfect: boolean
	/**
	 * Bitwise flag. Feel free to use `getMods` to see the mods in a more readable way!
	 */
	enabled_mods: number
	user_id: number
	date: Date
	rank: number
	pp?: number
	replay_available?: boolean
}
