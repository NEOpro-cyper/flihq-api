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
      // epID = embed URL from FlixHQ
      // e.g. https://videostr.net/embed-1/v3/e-1/gFGvdCzL50U5?z=
      iframeURL = epID;

      let _k = null;
      let embedPage = null;

      // Retry up to 3 times to get _k key
      for (let attempt = 1; attempt <= 3; attempt++) {
        const { data: page } = await axios.get(epID, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Referer": "https://flixhq.tw/",
            "Origin": "https://flixhq.tw",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });

        embedPage = page;

        const p1 = page.match(/<!--[^>]*_is_th:([A-Za-z0-9]+)[^>]*-->/);
        const p2 = page.match(/_is_th\s*[=:]\s*["']?([A-Za-z0-9]+)["']?/);
        const p3 = page.match(/window\._xy_ws\s*=\s*["']([^"']+)["']/);
        const p4 = page.match(/nonce\s*=\s*["']([^"']+)["']/);
        const p5 = page.match(/window\._lk_db\s*=\s*\{[^}]*:\s*["']([^"']+)["']/);

_k = p3?.[1] || p1?.[1] || p2?.[1] || p4?.[1] || p5?.[1];
        console.log(`Attempt ${attempt} — _k:`, _k);

        if (_k) break;
        await new Promise(r => setTimeout(r, 1500));
      }

      if (!_k) throw new Error("Cannot extract _k from embed page after 3 attempts");

      const $ = cheerio.load(embedPage);
      const sourceId = $("#megacloud-player").attr("data-id");
      if (!sourceId) throw new Error("Cannot find data-id in embed page");

      const baseUrl = new URL(epID).origin;
      const sourcesUrl = `${baseUrl}/embed-1/v3/e-1/getSources?id=${sourceId}&_k=${_k}`;
      console.log("sourcesUrl:", sourcesUrl);

      const { data: stream_data } = await axios.get(sourcesUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Referer": epID,
          "X-Requested-With": "XMLHttpRequest",
          "Accept": "application/json, text/plain, */*",
        },
      });

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
      `Error during decryptSources_v1(epID=${epID}, id=${id}, server=${name}):`,
      error.message
    );
    return null;
  }
}
