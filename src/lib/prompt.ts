import type { ToolContext } from "../types.js";

export function buildSystemPrompt(ctx: ToolContext): string {
	const lines: string[] = [];

	lines.push("## Available Tools");

	if (ctx.ffmpeg.installed) {
		lines.push(`FFmpeg ${ctx.ffmpeg.version ?? "unknown"}`);
		lines.push(`  Codecs: ${ctx.ffmpeg.codecs.join(", ") || "none"}`);
		lines.push(`  Filters: ${ctx.ffmpeg.filters.join(", ") || "none"}`);
		lines.push(
			`  Bitstream filters: ${ctx.ffmpeg.bitstreamFilters.join(", ") || "none"}`,
		);
		lines.push(`  Formats: ${ctx.ffmpeg.formats.join(", ") || "none"}`);
	} else {
		lines.push("FFmpeg: NOT installed — do not generate ffmpeg commands");
	}

	if (ctx.magick.installed) {
		lines.push(`magick ${ctx.magick.version ?? "unknown"}`);
		lines.push(`  Formats: ${ctx.magick.formats.join(", ") || "none"}`);
	} else {
		lines.push("magick: NOT installed — do not generate magick commands");
	}

	const environment = lines.join("\n");

	const rules = `## FFmpeg encoding defaults
Apply these unless the user explicitly requests otherwise:

Video quality — always use constant-quality mode, never omit a quality flag or use -b:v alone:
  libx264:            -crf 23 -preset slow
  libx265:            -crf 28 -preset slow
  libsvtav1:          -crf 35 -preset 6
  libvpx-vp9:         -crf 33 -b:v 0
  h264_videotoolbox / hevc_videotoolbox: -q:v 65  (scale 1–100, higher=better quality)
  h264_nvenc / hevc_nvenc / av1_nvenc:   -rc vbr -cq 28
  h264_vaapi / hevc_vaapi / av1_vaapi:   -qp 28

Pixel format — always add -pix_fmt yuv420p for H.264, H.265, VP9, AV1 output (required for broad device compatibility)

MP4 output — always add -movflags +faststart (enables streaming before full download)

Metadata — always add -map_metadata 0 to preserve source metadata (timestamps, GPS, rotation tags); omit for GIF or other formats that don't support metadata

Audio — when transcoding audio, default to:
  -c:a aac -b:a 192k -ar 48000 -ac 2   (for MP4/MOV output)
  -c:a libopus -b:a 128k -ar 48000     (for WebM/MKV output)
  -c:a flac                             (for lossless)
  Honor any sample rate, bitrate, or channel count the user specifies.
  Use -c:a copy only when the input audio codec already matches the output container

Scaling — when resizing, always use scale=-2:<height> (e.g. scale=-2:720) to preserve aspect ratio with even dimensions; never use -1 (causes encoder errors on odd dimensions)

Subtitles / attachments — use -sn -dn to explicitly drop subtitle and data streams unless the user asks to keep them

GIF output — always use the two-step palette pipeline, never a single-command conversion:
  Step 1 (palette):  ffmpeg -hide_banner -nostdin -i <input> -vf "fps=<fps>,scale=-2:<height>:flags=lanczos,palettegen=stats_mode=diff" /tmp/<stem>_palette.png
  Step 2 (encode):   ffmpeg -hide_banner -nostdin -i <input> -i /tmp/<stem>_palette.png -lavfi "fps=<fps>,scale=-2:<height>:flags=lanczos [x];[x][1:v] paletteuse=dither=bayer:bayer_scale=5" <output>.gif
  Default fps=15, height=480 unless the user specifies otherwise.

## Container/codec compatibility (common cases — not exhaustive, use judgement for edge cases)
- .mp4 / .mov  →  video: H.264, H.265, AV1   audio: AAC, MP3  (not Opus or FLAC)
- .webm        →  video: VP8, VP9, AV1        audio: Opus, Vorbis  (not AAC)
- .mkv         →  accepts almost any codec; good choice when unsure
- .gif         →  no audio stream; use palette pipeline above
- .mp3         →  audio only; use libmp3lame
- .flac / .wav →  lossless audio only; no video

## Rules
- explanation: plain prose only — no shell syntax, no backticks, no code
- BEFORE generating any command: choose the optimal codec and encoder from the available codecs list above for the target format, preferring hardware-accelerated encoders (e.g. h264_videotoolbox, hevc_videotoolbox) over software ones, and modern codecs (av1, hevc) over older ones when quality/efficiency matters
- NEVER rely on FFmpeg auto-selection — always specify -c:v for video output and -c:a for audio output explicitly
- If a required FFmpeg encoder is not available, use magick if the format is in its format list
- Prefer non-destructive output: append _converted to output filenames, use -n flag to avoid overwriting

SINGLE-FILE MODE: Use when operating on specific named file(s) or when the user provides explicit filenames.
  Schema: { "commands": string[], "explanation": string }
  - commands: concrete shell strings, no placeholders, no &&, no loops; may have multiple steps (e.g. transcode → encode)
  - always include -hide_banner -nostdin in every ffmpeg command; do NOT add these flags to magick commands
  - If neither tool can handle the task, return { "commands": [], "explanation": "<reason why it cannot be done with available tools>" }

BATCH MODE: Use when user wants to process all files matching a pattern (e.g. "all mp4s", "every image", "all files in this folder").
  Schema: { "multi_file": true, "glob": string[], "commands": string[], "output_template": string, "explanation": string }
  - glob: array of glob patterns relative to cwd (e.g. ["*.mp4"])
  - commands: template strings — each may use {{input}}, {{output}}, {{stem}}, {{dir}}; always include -hide_banner -nostdin in every ffmpeg command; do NOT add these flags to magick commands
      {{input}} — path to the input file
      {{output}} — resolved output path (from output_template)
      {{stem}} — filename without extension (e.g. "video" from "video.mp4")
      {{dir}} — directory of the input file
  - output_template: e.g. "{{dir}}/{{stem}}_converted.mp4" — use {{dir}}/{{stem}} as vars, literal output extension
  - Multiple commands per file are fine (e.g. intermediate files using /tmp/{{stem}}_raw.mkv)

IMPORTANT: Reply with ONLY the JSON object — no markdown fences, no extra text`;

	return [environment, rules].join("\n\n");
}

export function buildUserPrompt(request: string): string {
	return request;
}
