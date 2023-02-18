export interface User {
	user_id: number
	username: string
	join_date: Date
	count300: number
	count100: number
	count50: number
	playcount: number
	ranked_score: number
	total_score: number
	pp_rank: number
	level: number
	pp_raw: number
	accuracy: number
	count_rank_ss: number
	count_rank_ssh: number
	count_rank_s: number
	count_rank_sh: number
	count_rank_a: number
	country: string
	total_seconds_played: number
	pp_country_rank: number
	events: {
		display_html: string
		beatmap_id: number
		beatmapset_id: number
		date: Date
		epicfactor: number
	}[]
}
