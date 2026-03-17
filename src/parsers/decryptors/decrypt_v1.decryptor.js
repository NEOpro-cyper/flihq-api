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

      // Extract sourceId from embed URL
      // pattern: /e-1/SOURCE_ID?
      const sourceIdMatch = /\/e-1\/([^?/]+)/.exec(epID);
      const sourceId = sourceIdMatch?.[1];
      if (!sourceId) throw new Error("Cannot extract sourceId from: " + epID);

      // Fetch embed page to extract _k key
      const { data: embedPage } = await axios.get(epID, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Referer: "https://flixhq.tw/",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      // Extract _k from page source
      // Pattern: getSources?id=XXXX&_k=KEYVALUE
      const keyMatch = embedPage.match(/getSources\?id=[^&]+&_k=([^"'&\s\\]+)/);
      const _k = keyMatch?.[1];
      if (!_k) throw new Error("Cannot extract _k key from embed page: " + epID);

      // Build getSources URL
      // https://videostr.net/embed-1/v3/e-1/getSources?id=gFGvdCzL50U5&_k=KEY
      const baseUrl = epID.split("/e-1/")[0]; // https://videostr.net/embed-1/v3
      const sourcesUrl = `${baseUrl}/e-1/getSources?id=${sourceId}&_k=${_k}`;

      console.log("Sources URL:", sourcesUrl);

      const { data: stream_data } = await axios.get(sourcesUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Referer: epID,
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
