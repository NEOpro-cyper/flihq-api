import axios from "axios";
import * as cheerio from "cheerio";
import { fallback_1, fallback_2 } from "../../utils/fallback.js";

export async function decryptSources_v1(epID, id, name, type, fallback) {
  try {
    let decryptedSources = null;
    let iframeURL = null;

    if (fallback) {
      const fallback_server = ["upcloud", "vidsrc"].includes(name.toLowerCase())
        ? fallback_1
        : fallback_2;

      iframeURL = `https://${fallback_server}/stream/s-2/${epID}/${type}`;

      const { data } = await axios.get(iframeURL, {
        headers: { Referer: `https://${fallback_server}/` },
      });

      const $ = cheerio.load(data);
      const player = $("#megaplay-player");
      const dataId = player.attr("data-id") || player.attr("data-ep-id");

      const { data: decryptedData } = await axios.get(
        `https://${fallback_server}/stream/getSources?id=${dataId}`,
        { headers: { "X-Requested-With": "XMLHttpRequest" } }
      );
      decryptedSources = decryptedData;

} else {
  iframeURL = epID;

  // Fetch embed page
  const { data: embedPage } = await axios.get(epID, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Referer: "https://flixhq.tw/",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  // Log all HTML comments
  const commentCheck = embedPage.match(/<!--[\s\S]*?-->/g);
  console.log("HTML comments found:", JSON.stringify(commentCheck));

  const $ = cheerio.load(embedPage);

  // Get sourceId from player div
  const sourceId = $("#megacloud-player").attr("data-id");
  console.log("sourceId from player:", sourceId);
  if (!sourceId) throw new Error("Cannot find data-id in embed page");

  // Try all key patterns
  const pattern1 = embedPage.match(/<!--\s*_is_th:([A-Za-z0-9]+)\s*-->/);
  const pattern2 = embedPage.match(/_is_th\s*:\s*([A-Za-z0-9]+)/);
  const pattern3 = embedPage.match(/window\._xy_ws\s*=\s*["']([^"']+)["']/);
  const pattern4 = embedPage.match(/nonce\s*=\s*["']([^"']+)["']/);

  console.log("pattern1 _is_th comment:", pattern1?.[1]);
  console.log("pattern2 _is_th inline:", pattern2?.[1]);
  console.log("pattern3 _xy_ws:", pattern3?.[1]);
  console.log("pattern4 nonce:", pattern4?.[1]);

  const _k = pattern1?.[1] || pattern2?.[1] || pattern3?.[1] || pattern4?.[1];
  console.log("final _k:", _k);
  if (!_k) throw new Error("Cannot extract _k from embed page");

  // Build getSources URL
  const baseUrl = new URL(epID).origin;
  const sourcesUrl = `${baseUrl}/embed-1/v3/e-1/getSources?id=${sourceId}&_k=${_k}`;
  console.log("sourcesUrl:", sourcesUrl);

  const { data: stream_data } = await axios.get(sourcesUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Referer: epID,
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json, text/plain, */*",
    },
  });

  console.log("stream_data:", JSON.stringify(stream_data));
  decryptedSources = stream_data;
}

      const $ = cheerio.load(embedPage);

      // Get sourceId from data-id attribute of player
      const sourceId = $("#megacloud-player").attr("data-id");
      if (!sourceId) throw new Error("Cannot find data-id in embed page");
      console.log("sourceId from player:", sourceId);

      // Get key from _is_th comment
      // <!-- _is_th:Mv9eR4JFBZM8YcOAYipVhe0xFjQc6k0zXvsYOWVgZzBfDMUZ -->
      const isThMatch = embedPage.match(/_is_th:([A-Za-z0-9]+)/);
      const _k = isThMatch?.[1];
      console.log("_k from _is_th:", _k);
      if (!_k) throw new Error("Cannot extract _k from _is_th comment");

      // Build getSources URL
      // https://videostr.net/embed-1/v3/e-1/getSources?id=yBH0MU5WRzsE&_k=Mv9eR4...
      const baseUrl = new URL(epID).origin;
      const pathMatch = epID.match(/\/embed-1\/v3\/e-1\//);
      const sourcesUrl = `${baseUrl}/embed-1/v3/e-1/getSources?id=${sourceId}&_k=${_k}`;
      console.log("sourcesUrl:", sourcesUrl);

      const { data: stream_data } = await axios.get(sourcesUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Referer: epID,
          "X-Requested-With": "XMLHttpRequest",
          Accept: "application/json, text/plain, */*",
        },
      });

      console.log("stream_data:", JSON.stringify(stream_data));
      decryptedSources = stream_data;
    }

    return {
      id,
      type,
      link: {
        file: fallback
          ? (decryptedSources?.sources?.file ?? "")
          : (decryptedSources?.sources?.[0]?.file ?? ""),
        type: "hls",
      },
      tracks: decryptedSources?.tracks ?? [],
      intro: decryptedSources?.intro ?? null,
      outro: decryptedSources?.outro ?? null,
      iframe: iframeURL,
      server: name,
    };
  } catch (error) {
    console.error(
      `=== ERROR decryptSources_v1 epID=${epID} id=${id} server=${name}:`,
      error.message
    );
    return null;
  }
}
