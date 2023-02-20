export interface Match {
	/**
	 * Has the info about the match that is not related to what's been played
	 */
	match: {
		match_id: number,
		name: string,
		start_time: Date,
		/**
		 * If the match is not disbanded, null
		 */
		end_time: Date | null
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
		/**
		 * Bitwise flag. Feel free to use `getMods` to see the mods in a more readable way! Do note that individual scores have a nullable `enabled_mods` property
		 */
		mods: number
		scores: {
			slot: number,
			/**
			 * 0 if no team, 1 if blue, 2 if red
			 */
			team: number,
			user_id: number,
			score: number,
			maxcombo: number,
			/**
			 * Is always 0, "is not used" according to documentation
			 */
			rank: number,
			count50: number,
			count100: number,
			count300: number,
			countmiss: number,
			countgeki: number,
			countkatu: number,
			/**
			 * Documentation says "If full combo", but should be "If SS/100% accuracy"
			 */
			perfect: boolean,
			/**
			 * If the player is alive at the end of the map
			 */
			pass: boolean,
			/**
			 * Is null if no freemod
			 */
			enabled_mods: number | null
		}[]
		getScoringType: Function
	}[]
}
