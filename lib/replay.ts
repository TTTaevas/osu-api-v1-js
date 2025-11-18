/** You might wanna check out https://osu.ppy.sh/wiki/en/Client/File_formats/Osr_%28file_format%29 */
export interface Replay {
	/** Encoded LZMA stream */
	content: string
	/** The encoding `content` uses, should always be "base64" */
	encoding: string
}
