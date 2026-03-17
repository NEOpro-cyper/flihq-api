import axios from "axios";
import * as cheerio from "cheerio";
import { v1_base_url } from "../utils/base_v1.js";
import { DEFAULT_HEADERS } from "../configs/header.config.js";
import { decryptSources_v1 } from "../parsers/decryptors/decrypt_v1.decryptor.js";

// For TV episodes
export async function extractServers(id) {
  try {
    const { data } = await axios.get(
      `https://${v1_base_url}/ajax/episode/servers/${id}`,
      { headers: { ...DEFAULT_HEADERS, "X-Requested-With": "XMLHttpRequest" } }
    );
    const $ = cheerio.load(data);
    const servers = [];
    $(".nav-item a.link-item").each((_, el) => {
      const dataId = $(el).attr("data-id") || $(el).attr("data-linkid");
      const serverName = $(el).find("span").text().trim() || $(el).attr("title");
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

// For movies
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
      const serverName = $(el).find("span").text().trim() || $(el).attr("title");
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
    return data?.link || null;
  } catch (error) {
    console.error("Embed link error:", error.message);
    return null;
  }
}

export async function extractStreamingInfo(episodeId, serverName, type, fallback) {
  try {
    let servers = [];
    let selectedDataId = null;

    if (type === "movie") {
      // episodeId IS the linkId directly e.g. 12842812
      selectedDataId = episodeId;
      servers = [{ dataId: episodeId, serverName: serverName || "UpCloud" }];

    } else {
      // episodeId is episode ID e.g. 1676371
      // get servers → picks data-id e.g. 13228416
      servers = await extractServers(episodeId);
      if (!servers.length) throw new Error("No servers found for id: " + episodeId);

      if (serverName.toLowerCase() === "hd-1") serverName = "upcloud";
      else if (serverName.toLowerCase() === "hd-2") serverName = "megacloud";

      let server = servers.find(
        (s) => s.serverName.toLowerCase() === serverName.toLowerCase()
      );
      if (!server) server = servers[0];
      selectedDataId = server.dataId;
    }

    const embedLink = await getEmbedLink(selectedDataId);
    if (!embedLink) throw new Error("No embed link for dataId: " + selectedDataId);

    console.log("Embed link:", embedLink);

    const streamingLink = await decryptSources_v1(
      embedLink,
      selectedDataId,
      serverName,
      type,
      fallback
    );

    return { streamingLink, servers };
  } catch (error) {
    console.error("Stream info error:", error.message);
    return { streamingLink: null, servers: [] };
  }
}
