import axios from "axios";
import * as cheerio from "cheerio";
import { fallback_1, fallback_2 } from "../../utils/fallback.js";

async function fetchWithRetry(url, headers, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const { data } = await axios.get(url, { headers });
      if (data && data.length > 500) return data;
      console.log(`Retry ${i + 1} — response too short: ${data.length}`);
    } catch (e) {
      console.log(`Retry ${i + 1} failed:`, e.message);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error("All retries failed for: " + url);
}

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

      const embedHeaders = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": "https://flixhq.tw/",
        "Origin": "https://flixhq.tw",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Sec-Fetch-Dest": "iframe",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "cross-site",
        "Upgrade-Insecure-Requests": "1",
      };

      const embedPage = await fetchWithRetry(epID, embedHeaders);

      const $ = cheerio.load(embedPage);
      const sourceId = $("#megacloud-player").attr("data-id");
      console.log("sourceId:", sourceId);
      if (!sourceId) throw new Error("Cannot find data-id in embed page");

      const pattern1 = embedPage.match(/<!--\s*_is_th:([A-Za-z0-9]+)\s*-->/);
      const pattern2 = embedPage.match(/_is_th\s*:\s*([A-Za-z0-9]+)/);
      const pattern3 = embedPage.match(/window\._xy_ws\s*=\s*["']([^"']+)["']/);
      const pattern4 = embedPage.match(/nonce\s*=\s*["']([^"']+)["']/);

      const _k = pattern1?.[1] || pattern2?.[1] || pattern3?.[1] || pattern4?.[1];
      console.log("_k:", _k);
      if (!_k) throw new Error("Cannot extract _k from embed page");

      const baseUrl = new URL(epID).origin;
      const sourcesUrl = `${baseUrl}/embed-1/v3/e-1/getSources?id=${sourceId}&_k=${_k}`;
      console.log("sourcesUrl:", sourcesUrl);

      const { data: stream_data } = await axios.get(sourcesUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Referer": epID,
          "X-Requested-With": "XMLHttpRequest",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
          "Origin": new URL(epID).origin,
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
