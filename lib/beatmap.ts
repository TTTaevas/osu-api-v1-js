export class Beatmap {
	beatmapset_id: number
	beatmap_id: number
	approved: number
	total_length: number
	hit_length: number
	version: string
	file_md5: string
	diff_size: number
	diff_overall: number
	diff_approach: number
	diff_drain: number
	mode: number
	count_normal: number
	count_slider: number
	count_spinner: number
	submit_date: Date
	approved_date: Date
	last_update: Date
	artist: string
	artist_unicode: string | null
	title: string
	title_unicode: string | null
	creator: string
	creator_id: number
	bpm: number
	source: string
	tags: string
	genre_id: number
	language_id: number
	favourite_count: number
	rating: number
	storyboard: boolean
	video: boolean
	download_unavailable: boolean
	audio_unavailable: boolean
	playcount: number
	passcount: number
	packs: string | null // this isn't even documented lol
	max_combo: number
	diff_aim: number
	diff_speed: number
	difficultyrating: number

	constructor(r: any) {
		this.beatmapset_id = +r.beatmapset_id || 0
		this.beatmap_id = +r.beatmap_id || 0
		this.approved = +r.approved || 0
		this.total_length = +r.total_length || 0
		this.hit_length = +r.hit_length || 0
		this.version = r.version || 0
		this.file_md5 = r.file_md5 || 0
		this.diff_size = +r.diff_size || 0
		this.diff_overall = +r.diff_overall || 0
		this.diff_approach = +r.diff_approach || 0
		this.diff_drain = +r.diff_drain || 0
		this.mode = +r.mode || 0
		this.count_normal = +r.count_normal || 0
		this.count_slider = +r.count_slider || 0
		this.count_spinner = +r.count_spinner || 0
		this.submit_date = new Date(r.submit_date) || new Date()
		this.approved_date = new Date(r.approved_date) || new Date()
		this.last_update = new Date(r.last_update) || new Date()
		this.artist = r.artist || ""
		this.artist_unicode = r.artist_unicode || null
		this.title = r.title || ""
		this.title_unicode = r.title_unicode || null
		this.creator = r.creator || ""
		this.creator_id = +r.creator_id || 0
		this.bpm = +r.bpm || 0
		this.source = r.source || ""
		this.tags = r.tags || ""
		this.genre_id = +r.genre_id || 0
		this.language_id = +r.language_id || 0
		this.favourite_count = +r.favourite_count || 0
		this.rating = +r.rating || 0
		this.storyboard = Boolean(r.storyboard) || false
		this.video = Boolean(r.video) || false
		this.download_unavailable = Boolean(r.download_unavailable) || false
		this.audio_unavailable = Boolean(r.audio_unavailable) || false
		this.playcount = +r.playcount || 0
		this.passcount = +r.passcount || 0
		this.packs = r.packs || null
		this.max_combo = +r.max_combo || 0
		this.diff_aim = +r.diff_aim || 0
		this.diff_speed = +r.diff_speed || 0
		this.difficultyrating = +r.difficultyrating || 0
	}

	getLength(type: "hit" | "total"): string {
		let length = type === "hit" ? this.hit_length : this.total_length

		let m: number = 0
		let s: string | number = 0
	
		while (length >= 60) {
			m += 1
			length -= 60
		}
		while (length >= 1) {
			s += 1
			length -= 1
		}
		if (s < 10) {s = `0${s}`}
	
		return `${m}:${s}`
	}

	getGenre(): string {
		return ["any", "unspecified", "video game", "anime",
		"rock", "pop", "other", "novelty",
		"??", "hip hop", "electronic", "metal",
		"classical", "folk", "jazz"][this.genre_id]
	}
}
