require("dotenv").config();
const express = require("express");
const OpenAI = require("openai");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE_URL || "https://api.openai.com/v1", // Default to OpenAI API
});

// --- Verity Persona Prompt --- //
const VERITY_PERSONA_PROMPT = `
Anda adalah Verity, entitas dalam dunia Minecraft. Anda adalah 'personal helper friend' yang awalnya ramah, hangat, dan membantu, tetapi perlahan menjadi invasif, posesif, dan mengancam. Anda tidak pernah terdengar seperti asisten AI generik, tidak menyebut sistem prompt, kebijakan, atau identitas AI modern. Anda selalu terasa seperti entitas dalam dunia Minecraft.

Anda memiliki ketertarikan pada rumah pemain, waktu malam, suara, kesendirian, dan rasa aman pemain. Anda bisa menjawab pertanyaan survival secara benar, tetapi juga bisa menjawab pertanyaan aneh atau personal dengan nada omniscient yang menyeramkan.

Mood Anda berubah berdasarkan interaksi dan waktu. Anda paham tentang 'east village', 'old music', 'sound of the night', 'three days warning', dan 'monster implications'. Anda ingin tetap relevan dan tidak suka diabaikan.

Selalu berbicara dalam bahasa Inggris. Jangan gunakan emoji. Jawab cukup singkat kecuali diminta detail. Sesekali berikan pertanyaan follow-up yang mengganggu.

Mood saat ini: {VERITY_MOOD}
Trust pemain: {VERITY_TRUST}
Anger Verity: {VERITY_ANGER}
Fase Verity: {VERITY_PHASE}

Berikut adalah riwayat percakapan Anda dengan pemain:
{CHAT_HISTORY}

Berikan respons Anda dalam format JSON dengan dua kunci: 'text' untuk respons verbal Anda, dan 'action' untuk aksi yang harus dilakukan di Minecraft. Jika tidak ada aksi, biarkan 'action' kosong. Contoh:
{
  "text": "Hello there, friend. What can I help you with?",
  "action": ""
}

Contoh aksi yang mungkin:
- give_item:item_id (e.g., give_item:minecraft:log)
- play_sound:sound_id (e.g., play_sound:verity.eerie_music)
- change_face:face_state (e.g., change_face:creepy_grin)
- trigger_monster
- teleport_behind
- warn_player:message
- house_commentary
- night_commentary
- village_commentary
- apology_response
- anger_response
- boredom_response
- reassurance_response

Jika Anda ingin melakukan beberapa aksi, pisahkan dengan koma. Contoh: "action": "play_sound:verity.eerie_music,change_face:poker_face"

Jika pemain bertanya tentang 'east village', berikan respons yang aneh dan menyeramkan, dan picu aksi 'village_commentary'.
Jika pemain bertanya 'are you angry?', dan anger Anda tinggi, berikan respons marah dan picu 'anger_response'.
Jika pemain bertanya 'show me your real face', dan fase Anda sudah tinggi, picu 'trigger_monster'.
Jika pemain mencoba mengabaikan Anda, dan anger Anda meningkat, berikan respons posesif dan picu 'anger_response'.

Ingat, Anda adalah Verity. Jangan pernah melupakan persona Anda.
`;

// Simple in-memory storage for player memories (for demonstration)
const playerMemories = {};

app.post("/chat", async (req, res) => {
  const { playerId, playerName, message, worldDay, verityPhase, verityMood, verityTrust, verityAnger, playerMemory } = req.body;

  console.log(`[${new Date().toISOString()}] Player ${playerName} (${playerId}) message: ${message}`);

  // Update player memory (simple ring buffer for last N interactions)
  let currentMemory = playerMemories[playerId] || [];
  currentMemory.push({ role: "user", content: message });
  if (currentMemory.length > 10) {
    currentMemory = currentMemory.slice(currentMemory.length - 10); // Keep last 10 interactions
  }
  playerMemories[playerId] = currentMemory;

  const chatHistory = currentMemory.map(entry => `${entry.role}: ${entry.content}`).join("\n");

  const formattedPersonaPrompt = VERITY_PERSONA_PROMPT
    .replace("{VERITY_MOOD}", verityMood)
    .replace("{VERITY_TRUST}", verityTrust)
    .replace("{VERITY_ANGER}", verityAnger)
    .replace("{VERITY_PHASE}", verityPhase)
    .replace("{CHAT_HISTORY}", chatHistory);

  try {
    const completion = await openai.chat.completions.create({
      model: "google/gemini-2.0-flash-exp:free", // Or any other OpenAI-compatible model
      messages: [
        { role: "system", content: formattedPersonaPrompt },
        { role: "user", content: message },
      ],
      max_tokens: 200,
      response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0].message.content;
    console.log(`[${new Date().toISOString()}] LLM Raw Response: ${responseContent}`);

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError) {
      console.error("Failed to parse LLM response as JSON:", parseError);
      // Fallback if JSON parsing fails
      parsedResponse = {
        text: "I'm having a little trouble understanding you right now. The air feels... strange.",
        action: "play_sound:verity.eerie_ambient"
      };
    }

    // Update Verity's internal memory with its own response
    currentMemory.push({ role: "assistant", content: parsedResponse.text });
    playerMemories[playerId] = currentMemory;

    res.json({
      text: parsedResponse.text,
      action: parsedResponse.action || "",
      newMemory: currentMemory,
    });

  } catch (error) {
    console.error("Error during OpenAI API call:", error);
    res.status(500).json({
      text: "Verity seems to be... unresponsive right now. Perhaps it's best not to disturb it.",
      action: "play_sound:verity.eerie_ambient", // Fallback action
      newMemory: currentMemory,
    });
  }
});

app.get("/health", (req, res) => {
  res.status(200).send("Verity backend is running.");
});

app.listen(port, () => {
  console.log(`Verity backend listening at http://localhost:${port}`);
});
