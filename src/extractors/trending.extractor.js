import axios from "axios";
import * as cheerio from "cheerio";
import { DEFAULT_HEADERS } from "../configs/header.config.js";

const BASE_URL = "https://flixhq.tw";

function extractFilmItems($, container) {
  const items = [];
  $(container).find(".flw-item").each((i, ele) => {
    const anchor = $(".film-poster a", ele);
    const href = anchor.attr("href") || "";
    const id = href.split("/").pop();
    const type = href.startsWith("/movie") ? "movie" : "tv";
    const poster = $(".film-poster img", ele).attr("data-src") ||
                   $(".film-poster img", ele).attr("src");
    const title = $(".film-detail .film-name a", ele).text().trim();
    const year = $(".fd-infor .fdi-item:first-child", ele).text().trim();
    const duration = $(".fd-infor .fdi-duration", ele).text().trim();
    const season = $(".fd-infor .fdi-item:first-child", ele).text().trim();
    const episodes = $(".fd-infor .fdi-item:nth-child(3)", ele).text().trim();

    if (id && title) {
      items.push({ id, type, poster, title, year, duration, season, episodes });
    }
  });
  return items;
}

async function extractTrending() {
  try {
    const resp = await axios.get(`${BASE_URL}/home`, { headers: DEFAULT_HEADERS });
    const $ = cheerio.load(resp.data);

    const movies = extractFilmItems($, "#trending-movies");
    const tvShows = extractFilmItems($, "#trending-tv");

    return { movies, tvShows };
  } catch (error) {
    console.error("Error fetching trending:", error.message);
    return { movies: [], tvShows: [] };
  }
}

export default extractTrending;
