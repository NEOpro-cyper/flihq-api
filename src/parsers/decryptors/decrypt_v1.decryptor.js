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
      console.log("=== STEP 1: Embed URL ===", epID);

      // Extract sourceId
      const sourceIdMatch = /\/e-1\/([^?/]+)/.exec(epID);
      const sourceId = sourceIdMatch?.[1];
      console.log("=== STEP 2: sourceId ===", sourceId);
      if (!sourceId) throw new Error("Cannot extract sourceId from: " + epID);

      // Fetch embed page
      const { data: embedPage } = await axios.get(epID, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Referer: "https://flixhq.tw/",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      console.log("=== STEP 3: Embed page length ===", embedPage.length);
      console.log("=== STEP 3: Embed page snippet ===", embedPage.substring(0, 500));
      console.log("=== STEP 3: FULL EMBED PAGE ===", embedPage);

      // Try all possible _k patterns
      const keyMatch1 = embedPage.match(/getSources\?id=[^&]+&_k=([^"'&\s\\]+)/);
      const keyMatch2 = embedPage.match(/_k=([^"'&\s\\]+)/);
      const keyMatch3 = embedPage.match(/['"_]k['"]\s*[:=]\s*['"]([^'"]+)['"]/);

      console.log("=== STEP 4: keyMatch1 ===", keyMatch1?.[1]);
      console.log("=== STEP 4: keyMatch2 ===", keyMatch2?.[1]);
      console.log("=== STEP 4: keyMatch3 ===", keyMatch3?.[1]);

      const _k = keyMatch1?.[1] || keyMatch2?.[1] || keyMatch3?.[1];
      if (!_k) throw new Error("Cannot extract _k key from embed page");

      const baseUrl = epID.split("/e-1/")[0];
      const sourcesUrl = `${baseUrl}/e-1/getSources?id=${sourceId}&_k=${_k}`;
      console.log("=== STEP 5: sourcesUrl ===", sourcesUrl);

      const { data: stream_data } = await axios.get(sourcesUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Referer: epID,
          "X-Requested-With": "XMLHttpRequest",
          Accept: "application/json, text/plain, */*",
        },
      });

      console.log("=== STEP 6: stream_data ===", JSON.stringify(stream_data));
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
