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
	enabled_mods: number
	user_id: number
	date: Date
	rank: number
	pp?: number
	replay_available?: boolean
}
