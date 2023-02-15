export class User {
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

	constructor(r: any) {
		this.user_id = +r.user_id || 0
		this.username = r.username || "" 
		this.join_date = new Date(r.join_date) || new Date()
		this.count300 = +r.count300 || 0
		this.count100 = +r.count100 || 0
		this.count50 = +r.count50  || 0
		this.playcount = +r.playcount || 0
		this.ranked_score = +r.ranked_score || 0
		this.total_score = +r.total_score || 0
		this.pp_rank = +r.pp_rank || 0
		this.level = +r.level || 0
		this.pp_raw = +r.pp_raw || 0
		this.accuracy = +r.accuracy || 0
		this.count_rank_ss = +r.count_rank_ss || 0
		this.count_rank_ssh = +r.count_rank_ssh || 0
		this.count_rank_s = +r.count_rank_s || 0
		this.count_rank_sh = +r.count_rank_sh || 0
		this.count_rank_a = +r.count_rank_a || 0
		this.country = r.country || ""
		this.total_seconds_played = +r.total_seconds_played || 0
		this.pp_country_rank = +r.pp_country_rank || 0
		if (r.events) {
			r.events.forEach((e: any) => {
				e.beatmap_id = +e.beatmap_id
				e.beatmapset_id = +e.beatmapset_id
				e.date = new Date(e.date)
				e.epicfactor = +e.epicfactor
			})
		}
		this.events = r.events || []
	}
}
