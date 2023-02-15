export class Score {
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

	constructor(r: any) {
		this.beatmap_id = +r.beatmap_id
		this.score_id = +r.score_id
		this.score = +r.score
		this.maxcombo = +r.maxcombo
		this.count50 = +r.count50
		this.count100 = +r.count100
		this.count300 = +r.count300
		this.countmiss = +r.countmiss
		this.countkatu = +r.countkatu
		this.countgeki = +r.countgeki
		this.perfect = Boolean(r.perfect)
		this.enabled_mods = +r.enabled_mods
		this.user_id = +r.user_id
		this.date = new Date(r.date)
		this.rank = +r.rank
		if (r.pp) {this.pp = +r.pp}
		if (r.replay_available) {this.replay_available = Boolean(r.replay_available)}
	}
}
