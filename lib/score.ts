import { Beatmap } from "./beatmap.js"
import { Mods } from "./mods.js"
import { User } from "./user.js"

export interface Score {
	/**
	 * The id of the score!
	 * @remarks If the score is a fail (is not completed, has a "F" rank/grade) then this is null
	 */
	score_id: number | null
	/** The score itself, for example `923357` */
	score: number
	maxcombo: number
	count50: number
	count100: number
	count300: number
	countmiss: number
	/** https://osu.ppy.sh/wiki/en/Gameplay/Judgement/Katu */
	countkatu: number
	/** https://osu.ppy.sh/wiki/en/Gameplay/Judgement/Geki */
	countgeki: number
	/** Whether or not the play has reached the maximum combo it could have (no miss **and no missed slider-end**) */
	perfect: boolean
	/** @remarks If it has Nightcore, it also has DoubleTime */
	enabled_mods: Mods[]
	user_id: User["user_id"]
	/** Roughly (or just after) when the last note was hit */
	date: Date
	/** Also known as the Grade https://osu.ppy.sh/wiki/en/Gameplay/Grade, it may be "F" if the player failed */
	rank: string
}

/** This is the kind of score you can expect from the API's `getUserRecentScores`*/
export interface ScoreWithBeatmapid extends Score {
	beatmap_id: Beatmap["beatmap_id"]
}

/** This is the kind of score you can expect from the API's `getBeatmapScores` */
export interface ScoreWithReplayavailablePp extends Score {
	/** @remarks It can't be null, because ScoreWithReplayavailablePp is only available for scores that haven't failed */
	score_id: number
	/**
	 * How much pp the score play is worth!
	 * @remarks Null if beatmap is loved (for example)
	 */
	pp: number | null
	replay_available: boolean
}

/** This is the kind of score you can expect from the API's `getUserBestScores` */
export interface ScoreWithBeatmapidReplayavailablePp extends ScoreWithBeatmapid, ScoreWithReplayavailablePp {
	/** @remarks It can't be null, because ScoreWithBeatmapidReplayavailablePp is only available for scores that haven't failed */
	score_id: number
	/** @remarks It can't be null, because ScoreWithBeatmapidReplayavailablePp is only available for scores that are worth something */
	pp: number
}
