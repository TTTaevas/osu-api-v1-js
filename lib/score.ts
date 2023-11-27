export interface Score {
	/**
	 * If the score is a fail (is not completed, has a "F" rank/grade) then this is null
	 */
	score_id: number | null
	score: number
	maxcombo: number
	count50: number
	count100: number
	count300: number
	countmiss: number
	/**
	 * https://osu.ppy.sh/wiki/en/Gameplay/Judgement/Katu
	 */
	countkatu: number
	/**
	 * https://osu.ppy.sh/wiki/en/Gameplay/Judgement/Geki
	 */
	countgeki: number
	/**
	 * Whether or not the play has reached the maximum combo it could have (no miss **and no missed slider-end**)
	 */
	perfect: boolean
	/**
	 * Bitwise flag, feel free to use `getMods` to see the mods in a more readable way!
	 */
	enabled_mods: number
	user_id: number
	/**
	 * Roughly (or just after) when the last note was hit
	 */
	date: Date
	/**
	 * Also known as the Grade https://osu.ppy.sh/wiki/en/Gameplay/Grade, it may be "F" if the player failed
	 */
	rank: string
	pp?: number
	replay_available?: boolean
}

export interface ScoreWithBeatmapid extends Score {
	beatmap_id: number
}
