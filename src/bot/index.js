const { Client, GatewayIntentBits, Events, Partials } = require("discord.js");
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const config = require("./config.json");

let videoUrls = [];
let lastViewedVideoIndex = 0;
const STATE_FILE = path.join(__dirname, "state.json");

function saveState() {
  const state = {
    videoUrls: videoUrls,
    lastViewedVideoIndex: lastViewedVideoIndex,
  };
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
    console.log("Estado guardado exitosamente.");
  } catch (error) {
    console.error("Error al guardar el estado:", error);
  }
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const stateData = fs.readFileSync(STATE_FILE, "utf8");
      const state = JSON.parse(stateData);
      videoUrls = state.videoUrls || [];
      lastViewedVideoIndex = state.lastViewedVideoIndex || 0;
      console.log("Estado cargado exitosamente.");
    } catch (error) {
      console.error("Error al cargar el estado:", error);
      videoUrls = [];
      lastViewedVideoIndex = 0;
    }
  } else {
    console.log("No se encontró archivo de estado. Iniciando desde cero.");
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const app = express();

app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.url}`);
  next();
});

client.once("ready", () => {
  console.log(`Bot de Discord listo como ${client.user.tag}!`);
  console.log(`Monitoreando el canal con ID: ${config.targetChannelId}`);
  loadState();
});

const LIKE_EMOJI = "👍";
const DISLIKE_EMOJI = "👎";

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.channel.id !== config.targetChannelId) {
    return;
  }

  const videoAttachments = message.attachments.filter((attachment) => {
    return (
      attachment.contentType && attachment.contentType.startsWith("video/")
    );
  });

  if (videoAttachments.size > 0) {
    const videoUrl = videoAttachments.first();
    videoUrls.push({
      id: message.id,
      url: videoUrl.url,
      filename: videoUrl.name,
      uploadedBy: message.author.tag,
      userId: message.author.id,
      timestamp: message.createdTimestamp,
      likes: 0,
      dislikes: 0,
    });
    saveState();

    try {
      await message.react(LIKE_EMOJI);
      await message.react(DISLIKE_EMOJI);
    } catch (error) {
      console.error(`Error al reaccionar al mensaje ${message.id}:`, error);
    }
  }
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  if (user.bot) return;

  if (reaction.message.channel.id !== config.targetChannelId) return;

  const videoIndex = videoUrls.findIndex(
    (video) => video.id === reaction.message.id
  );
  if (videoIndex === -1) return;

  if (reaction.emoji.name === LIKE_EMOJI) {
    videoUrls[videoIndex].likes += 1;
  } else if (reaction.emoji.name === DISLIKE_EMOJI) {
    videoUrls[videoIndex].dislikes += 1;
  }
  saveState();
});

client.on(Events.MessageReactionRemove, async (reaction, user) => {
  if (user.bot) return;

  if (reaction.message.channel.id !== config.targetChannelId) return;

  const videoIndex = videoUrls.findIndex(
    (video) => video.id === reaction.message.id
  );

  if (videoIndex === -1) return;
  const fetchedReaction = reaction.message.reactions.cache.get(
    reaction.emoji.id || reaction.emoji.name
  );
  if (fetchedReaction) {
    if (reaction.emoji.name === LIKE_EMOJI) {
      videoUrls[videoIndex].likes = fetchedReaction.count || 0;
    } else if (reaction.emoji.name === DISLIKE_EMOJI) {
      videoUrls[videoIndex].dislikes = fetchedReaction.count || 0;
    }
  } else {
    if (reaction.emoji.name === LIKE_EMOJI) {
      videoUrls[videoIndex].likes = 0;
    } else if (reaction.emoji.name === DISLIKE_EMOJI) {
      videoUrls[videoIndex].dislikes = 0;
    }
  }
  saveState();
});

app.get("/api/videos", (req, res) => {
  res.json({
    status: "success",
    count: videoUrls.length,
    videos: videoUrls,
    lastViewedVideoIndex: lastViewedVideoIndex,
  });
});

app.post("/api/videos/mark-as-viewed", (req, res) => {
  const { index, videoId } = req.body;
  let newIndex = -1;

  if (typeof index === "number" && index >= 0 && index < videoUrls.length) {
    newIndex = index + 1;
  } else if (videoId) {
    const foundIndex = videoUrls.findIndex((video) => video.id === videoId);
    if (foundIndex !== -1) {
      newIndex = foundIndex + 1;
    }
  }

  if (newIndex !== -1 && newIndex <= videoUrls.length) {
    lastViewedVideoIndex = newIndex;
    saveState();
    res.json({
      status: "success",
      message: "Video marcado como visto. Siguiente video disponible.",
      nextVideoIndex: lastViewedVideoIndex,
    });
  } else {
    res.status(400).json({
      status: "error",
      message: "Índice o ID de video inválido o ya no hay más videos.",
    });
  }
});

app.post("/api/ban", async (req, res) => {
  if (config.banActive === false) return;

  const { videoId } = req.body;
  const userId = videoUrls.find((video) => video.id === videoId)?.userId;

  try {
    const guild = client.guilds.cache.get(config.guildId);
    if (!guild) {
      res
        .status(404)
        .json({ status: "error", message: "Servidor no encontrado." });
      throw new Error(
        "Servidor (Guild) no encontrado. Asegúrate de que guildId esté configurado correctamente en config.json."
      );
    }
    const member = await guild.members.fetch(userId);
    if (member.bannable) {
      await member.ban();
      return res
        .status(200)
        .json({ status: "success", message: "Usuario baneado con éxito." });
    }
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.listen(config.expressPort, () => {
  console.log(
    `Servidor Express ejecutándose en http://localhost:${config.expressPort}`
  );
});

client.login(config.token);
