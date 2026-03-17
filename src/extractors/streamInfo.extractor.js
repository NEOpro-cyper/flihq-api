import axios from "axios";
import * as cheerio from "cheerio";
import { v1_base_url } from "../utils/base_v1.js";
import { DEFAULT_HEADERS } from "../configs/header.config.js";
import { decryptSources_v1 } from "../parsers/decryptors/decrypt_v1.decryptor.js";

export async function extractServers(id) {
  try {
    const { data } = await axios.get(
      `https://${v1_base_url}/ajax/episode/servers/${id}`,
      { headers: { ...DEFAULT_HEADERS, "X-Requested-With": "XMLHttpRequest" } }
    );
    const $ = cheerio.load(data);
    const servers = [];
    $(".nav-item a.link-item").each((_, el) => {
      const dataId = $(el).attr("data-id");
      const serverName = $(el).find("span").text().trim();
      if (dataId && serverName) {
        servers.push({ dataId, serverName });
      }
    });
    return servers;
  } catch (error) {
    console.error("Servers error:", error.message);
    return [];
  }
}

async function getEmbedLink(dataId) {
  try {
    const { data } = await axios.get(
      `https://${v1_base_url}/ajax/episode/sources/${dataId}`,
      { headers: { ...DEFAULT_HEADERS, "X-Requested-With": "XMLHttpRequest" } }
    );
    // Returns { type: "iframe", link: "https://videostr.net/embed-1/v3/e-1/XXXXX?z=" }
    return data?.link || null;
  } catch (error) {
    console.error("Embed link error:", error.message);
    return null;
  }
}

export async function extractStreamingInfo(episodeId, serverName, type, fallback) {
  try {
    const servers = await extractServers(episodeId);
    if (!servers.length) throw new Error("No servers found for id: " + episodeId);

    // Normalize server names
    if (serverName.toLowerCase() === "hd-1") serverName = "upcloud";
    else if (serverName.toLowerCase() === "hd-2") serverName = "megacloud";

    // Pick requested server or default to first
    let server = servers.find(
      (s) => s.serverName.toLowerCase() === serverName.toLowerCase()
    );
    if (!server) server = servers[0];

    // Get embed iframe URL from FlixHQ
    // Returns: https://videostr.net/embed-1/v3/e-1/gFGvdCzL50U5?z=
    const embedLink = await getEmbedLink(server.dataId);
    if (!embedLink) throw new Error("No embed link for dataId: " + server.dataId);

    console.log("Embed link:", embedLink);

    // decryptSources_v1(epID, id, name, type, fallback)
    // epID = embedLink (videostr URL)
    // id   = server.dataId
    const streamingLink = await decryptSources_v1(
      embedLink,
      server.dataId,
      server.serverName,
      type,
      fallback
    );

    return { streamingLink, servers };
  } catch (error) {
    console.error("Stream info error:", error.message);
    return { streamingLink: null, servers: [] };
  }
}
