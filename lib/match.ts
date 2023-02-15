class Game {
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

	constructor(g: any) {
		this.game_id = +g.game_id
		this.start_time = new Date(g.start_time)
		this.end_time = new Date(g.end_time)
		this.beatmap_id = +g.beatmap_id
		this.play_mode = +g.play_mode
		this.match_type = +g.match_type
		this.scoring_type = +g.scoring_type
		this.team_type = +g.team_type
		this.mods = +g.mods
		this.scores = g.scores.map((s: any) => {
			let keys = Object.keys(s)
			let values = Object.values(s)
			for (let i = 0; i < keys.length; i++) {
				if (values[i] !== null) {
					s[keys[i]] = Number(values[i])
				}
			}
		})
	}

	getScoringType() {
		return ["score", "accuracy", "combo", "scorev2"][this.scoring_type]
	}
}

export class Match {
	match: {
		match_id: number,
		name: string,
		start_time: Date,
		end_time: Date
	}
	games: Game[]

	constructor(r: any) {
		this.match = {
			match_id: +r.match.match_id || 0,
			name: r.match.name || 0,
			start_time: new Date(r.match.start_time) || new Date(),
			end_time: new Date(r.match.end_time) || new Date()
		}

		this.games = r.games ? r.games.map((g: any) => {
			return new Game(g)
		}) : []
	}
}
