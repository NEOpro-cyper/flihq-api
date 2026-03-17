import axios from "axios";
import * as cheerio from "cheerio";
import { v1_base_url } from "../utils/base_v1.js";
import { DEFAULT_HEADERS } from "../configs/header.config.js";

async function extractEpisodesList(id) {
  try {
    const showId = id.split("-").pop();
    const isMovie = id.startsWith("watch-") && !id.includes("/tv/");

    if (isMovie) {
      // Movie: GET /ajax/episode/list/{id}
      const resp = await axios.get(
        `https://${v1_base_url}/ajax/episode/list/${showId}`,
        { headers: { ...DEFAULT_HEADERS, "X-Requested-With": "XMLHttpRequest" } }
      );
      const $ = cheerio.load(resp.data);
      const servers = [];
      $(".nav-item a.link-item").each((_, el) => {
        const linkId = $(el).attr("data-linkid");
        const serverName = $(el).find("span").text().trim();
        if (linkId && serverName) {
          servers.push({ linkId, serverName });
        }
      });
      return { type: "movie", servers };

    } else {
      // TV Show: GET /ajax/season/list/{id}
      const seasonResp = await axios.get(
        `https://${v1_base_url}/ajax/season/list/${showId}`,
        { headers: { ...DEFAULT_HEADERS, "X-Requested-With": "XMLHttpRequest" } }
      );
      const $s = cheerio.load(seasonResp.data);
      const seasons = [];
      $s(".ss-item").each((_, el) => {
        const seasonId = $s(el).attr("data-id");
        const seasonName = $s(el).text().trim();
        if (seasonId) seasons.push({ seasonId, seasonName });
      });

      // Get episodes for each season
      const seasonsWithEpisodes = await Promise.all(
        seasons.map(async (season) => {
          const epsResp = await axios.get(
            `https://${v1_base_url}/ajax/season/episodes/${season.seasonId}`,
            { headers: { ...DEFAULT_HEADERS, "X-Requested-With": "XMLHttpRequest" } }
          );
          const $e = cheerio.load(epsResp.data);
          const episodes = [];
          $e(".eps-item").each((_, el) => {
            const episodeId = $e(el).attr("data-id");
            const title = $e(el).attr("title") || "";
            const epNum = title.match(/Eps (\d+)/)?.[1];
            const epTitle = title.replace(/Eps \d+:\s*/, "").trim();
            if (episodeId) {
              episodes.push({
                episodeId,
                episode_no: epNum ? parseInt(epNum) : null,
                title: epTitle,
              });
            }
          });
          return { ...season, episodes };
        })
      );

      return {
        type: "tv",
        totalSeasons: seasons.length,
        seasons: seasonsWithEpisodes,
      };
    }
  } catch (error) {
    console.error("Episode list error:", error.message);
    return [];
  }
}

export default extractEpisodesList;
