import OpenAI from "openai";

export type TTSProvider = "openai" | "elevenlabs";

export interface TTSConfig {
  provider: TTSProvider;
  apiKey: string;
  voiceId: string;   // openai: "nova"|"shimmer"|"alloy"|..., elevenlabs: voice ID
  model?: string;    // openai: "tts-1" | "tts-1-hd"
  speed?: number;    // openai: 0.25-4.0, default 1.0
}

export const OPENAI_VOICES = [
  { id: "nova",    label: "Nova — нежный, молодой женский" },
  { id: "shimmer", label: "Shimmer — чистый, ясный женский" },
  { id: "alloy",   label: "Alloy — нейтральный" },
  { id: "echo",    label: "Echo — мягкий мужской" },
  { id: "fable",   label: "Fable — выразительный" },
  { id: "onyx",    label: "Onyx — глубокий мужской" },
];

export async function synthesizeSpeech(text: string, cfg: TTSConfig): Promise<Buffer> {
  if (cfg.provider === "openai") {
    const client = new OpenAI({ apiKey: cfg.apiKey });
    const res = await client.audio.speech.create({
      model: (cfg.model ?? "tts-1") as any,
      voice: (cfg.voiceId ?? "nova") as any,
      input: text,
      response_format: "opus",
      speed: cfg.speed ?? 1.0
    });
    return Buffer.from(await res.arrayBuffer());
  }

  if (cfg.provider === "elevenlabs") {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${cfg.voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": cfg.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true }
        }),
        signal: AbortSignal.timeout(30_000)
      }
    );
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text().catch(() => "")}`);
    return Buffer.from(await res.arrayBuffer());
  }

  throw new Error(`Unknown TTS provider: ${cfg.provider}`);
}

/** Имя файла для Telegram: ogg для OpenAI opus, mp3 для ElevenLabs */
export function ttsFilename(cfg: TTSConfig): string {
  return cfg.provider === "openai" ? "voice.ogg" : "voice.mp3";
}
