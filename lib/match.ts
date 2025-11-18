import { Gamemodes } from "./misc.js"
import { Mods } from "./mods.js"
import { User } from "./user.js"

/** https://osu.ppy.sh/wiki/en/Client/Interface/Multiplayer#team-mode-gameplay */
export enum MultiplayerModes {
	"HEAD TO HEAD"	= 0,
	"TAG CO-OP"		= 1,
	"TEAM VS"		= 2,
	"TAG TEAM VS"	= 3,
}

/** https://osu.ppy.sh/wiki/en/Client/Interface/Multiplayer#win-condition */
export enum WinConditions {
	SCORE		= 0,
	ACCURACY	= 1,
	COMBO 		= 2,
	"SCORE V2"	= 3,
}

export interface Match {
	/** Has the info about the match that is not related to what's been played */
	match: {
		match_id: number
		name: string
		start_time: Date
		/** Is null if the match is not disbanded */
		end_time: Date | null
	}
	games: {
		game_id: number
		start_time: Date
		end_time: Date | null
		beatmap_id: number
		play_mode: Gamemodes
		match_type: number
		scoring_type: WinConditions
		team_type: MultiplayerModes
		/** Bitwise flag, feel free to use `getMods` to see the mods in a more readable way! Do note that individual scores have a nullable `enabled_mods` property */
		mods: Mods[]
		scores: {
			slot: number
			/** 0 if no team, 1 if blue, 2 if red */
			team: number
			user_id: User["user_id"]
			score: number
			maxcombo: number
			/** Is always 0, "is not used" according to API documentation */
			rank: number
			count50: number
			count100: number
			count300: number
			countmiss: number
			countgeki: number
			countkatu: number
			/** API Documentation says "If full combo", but should be "If SS/100% accuracy" */
			perfect: boolean
			/** If the player is alive at the end of the map */
			pass: boolean
			/** Is null if no freemod */
			enabled_mods: Mods[] | null
		}[]
	}[]
}
