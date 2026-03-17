import axios from "axios";
import * as cheerio from "cheerio";
import { v1_base_url } from "../utils/base_v1.js";
import { DEFAULT_HEADERS } from "../configs/header.config.js";
import { decryptSources_v1 } from "../parsers/decryptors/decrypt_v1.decryptor.js";

// Works for both movies (data-linkid) and TV episodes (data-id)
export async function extractServers(id) {
  try {
    const { data } = await axios.get(
      `https://${v1_base_url}/ajax/episode/servers/${id}`,
      { headers: { ...DEFAULT_HEADERS, "X-Requested-With": "XMLHttpRequest" } }
    );
    const $ = cheerio.load(data);
    const servers = [];

    $(".nav-item a.link-item").each((_, el) => {
      // Movies use data-linkid, TV uses data-id
      const dataId = $(el).attr("data-id") ||
                     $(el).attr("data-linkid");
      const serverName = $(el).find("span").text().trim() ||
                         $(el).attr("title");
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

// But for movies the server list endpoint is different
// /ajax/episode/list/{movieId} not /ajax/episode/servers/{id}
export async function extractMovieServers(movieId) {
  try {
    const { data } = await axios.get(
      `https://${v1_base_url}/ajax/episode/list/${movieId}`,
      { headers: { ...DEFAULT_HEADERS, "X-Requested-With": "XMLHttpRequest" } }
    );
    const $ = cheerio.load(data);
    const servers = [];

    $(".nav-item a.link-item").each((_, el) => {
      const dataId = $(el).attr("data-linkid");
      const serverName = $(el).find("span").text().trim() ||
                         $(el).attr("title");
      if (dataId && serverName) {
        servers.push({ dataId, serverName });
      }
    });

    return servers;
  } catch (error) {
    console.error("Movie servers error:", error.message);
    return [];
  }
}

async function getEmbedLink(dataId) {
  try {
    const { data } = await axios.get(
      `https://${v1_base_url}/ajax/episode/sources/${dataId}`,
      { headers: { ...DEFAULT_HEADERS, "X-Requested-With": "XMLHttpRequest" } }
    );
    // Returns { type: "iframe", link: "https://videostr.net/..." }
    return data?.link || null;
  } catch (error) {
    console.error("Embed link error:", error.message);
    return null;
  }
}

export async function extractStreamingInfo(episodeId, serverName, type, fallback) {
  try {
    let servers = [];

    if (type === "movie") {
      // For movies: episodeId IS the linkId (e.g. 12842812)
      // But we need the movieId to get all servers
      // Since we already have the linkId, just get embed directly
      // OR get all servers from /ajax/episode/list/{movieId}
      // Problem: we only have linkId not movieId here
      // Solution: just use the linkId directly to get embed
      servers = [{ dataId: episodeId, serverName: serverName || "UpCloud" }];

    } else {
      // For TV: episodeId is the episodeId (e.g. 1676371)
      servers = await extractServers(episodeId);
    }

    if (!servers.length) throw new Error("No servers found for id: " + episodeId);

    // Normalize server names
    if (serverName.toLowerCase() === "hd-1") serverName = "upcloud";
    else if (serverName.toLowerCase() === "hd-2") serverName = "megacloud";

    // Pick requested server or default to first
    let server = servers.find(
      (s) => s.serverName.toLowerCase() === serverName.toLowerCase()
    );
    if (!server) server = servers[0];

    // Get embed URL from /ajax/episode/sources/{dataId}
    const embedLink = await getEmbedLink(server.dataId);
    if (!embedLink) throw new Error("No embed link for dataId: " + server.dataId);

    console.log("Embed link:", embedLink);

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
