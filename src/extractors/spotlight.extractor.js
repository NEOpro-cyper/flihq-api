import axios from "axios";
import * as cheerio from "cheerio";
import { v1_base_url } from "../utils/base_v1.js";
import { DEFAULT_HEADERS } from "../configs/header.config.js";

async function extractSpotlights() {
  try {
    const resp = await axios.get(`https://${v1_base_url}/home`, { headers: DEFAULT_HEADERS });
    const $ = cheerio.load(resp.data);

    const slides = [];

    $("#slider .swiper-wrapper .swiper-slide:not(.swiper-slide-duplicate)").each((i, ele) => {
      const bgStyle = $(ele).attr("style") || "";
      const bgMatch = bgStyle.match(/url\("?([^")]+)"?\)/);
      const banner = bgMatch ? bgMatch[1] : null;

      const anchor = $(ele).find("a.slide-link");
      const href = anchor.attr("href") || "";
      const id = href.split("/").pop();
      const type = href.startsWith("/movie") ? "movie" : "tv";

      const title = $(ele).find(".slide-caption .film-title a").text().trim();
      const description = $(ele).find(".slide-caption .sc-desc").text().trim();
      const quality = $(ele).find(".scd-item .quality").text().trim();
      const duration = $(ele).find(".scd-item:contains('Duration') strong").text().trim();
      const imdb = $(ele).find(".scd-item:contains('IMDB') strong").text().trim();

      const genres = [];
      $(ele).find(".scd-item a.slide-genre-item").each((_, g) => {
        genres.push($(g).text().trim());
      });

      if (id && title) {
        slides.push({ id, type, title, banner, description, quality, duration, imdb, genres });
      }
    });

    return slides;
  } catch (error) {
    console.error("Error fetching spotlights:", error.message);
    return [];
  }
}

export default extractSpotlights;
