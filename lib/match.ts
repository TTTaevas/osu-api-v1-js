export interface Match {
	match: {
		match_id: number,
		name: string,
		start_time: Date,
		end_time: Date
	}
	games: {
		game_id: number
		start_time: Date
		end_time: Date
		beatmap_id: number
		play_mode: number
		match_type: number
		scoring_type: number
		team_type: number
		mods: number
		scores: {
			slot: number,
			team: number,
			user_id: number,
			score: number,
			maxcombo: number,
			rank: number,
			count50: number,
			count100: number,
			count300: number,
			countmiss: number,
			countgeki: number,
			countkatu: number,
			perfect: number,
			pass: number,
			enabled_mods: number | null
		}[]
		getScoringType: Function
	}[]
}
