import axios from "axios";
import * as cheerio from "cheerio";
import { v1_base_url } from "../utils/base_v1.js";
import { DEFAULT_HEADERS } from "../configs/header.config.js";

async function extractMediaInfo(id) {
  try {
    // id = movie/watch-wake-up-dead-man-a-knives-out-mystery-movies-free-138514
    // or  tv/watch-the-madison-movies-free-147781
    const resp = await axios.get(
      `https://${v1_base_url}/${id}`,
      { headers: DEFAULT_HEADERS }
    );
    const $ = cheerio.load(resp.data);

    // Basic info
    const numericId = id.split("-").pop();
    const type = id.startsWith("movie") ? "movie" : "tv";
    const title = $(".m_i-d-content .heading-name a").text().trim();
    const poster = $(".m_i-d-poster .film-poster-img").attr("src");
    const banner = $(".w_b-cover").attr("style")
      ?.match(/url\(([^)]+)\)/)?.[1]
      ?.replace(/['"]/g, "");
    const description = $(".m_i-d-content .description").text().trim();
    const quality = $(".m_i-d-content .btn-quality").text().trim();
    const imdb = $(".m_i-d-content .stats .item:nth-child(2)")
      .text().replace(/[^0-9.]/g, "").trim();
    const duration = $(".m_i-d-content .stats .item:nth-child(3)")
      .text().trim();

    // Trailer
    const trailerSrc = $("#iframe-trailer").attr("data-src") || "";
    const trailerIdMatch = trailerSrc.match(/embed\/([^?&]+)/);
    const trailer = trailerIdMatch ? {
      url: trailerSrc,
      thumbnail: `https://img.youtube.com/vi/${trailerIdMatch[1]}/hqdefault.jpg`
    } : null;

    // Elements
    const country = [];
    $(".elements .row-line:nth-child(1) a").each((_, el) => {
      country.push($(el).text().trim());
    });

    const genres = [];
    $(".elements .row-line:nth-child(2) a").each((_, el) => {
      genres.push($(el).text().trim());
    });

    const released = $(".elements .row-line:nth-child(3)")
      .text().replace("Released:", "").trim();

    const production = [];
    $(".elements .row-line:nth-child(4) a").each((_, el) => {
      production.push($(el).text().trim());
    });

    const cast = [];
    $(".elements .row-line:nth-child(5) a").each((_, el) => {
      cast.push({
        name: $(el).text().trim(),
        id: $(el).attr("href")?.split("/").pop(),
      });
    });

    // Related/recommended
    const related = [];
    $(".film-related .flw-item").each((_, el) => {
      const anchor = $(".film-poster a", el);
      const href = anchor.attr("href") || "";
      const relId = href.split("/").pop();
      const relType = href.startsWith("/movie") ? "movie" : "tv";
      const relPoster = $(".film-poster img", el).attr("data-src");
      const relTitle = $(".film-detail .film-name a", el).text().trim();
      const relYear = $(".fd-infor .fdi-item:first-child", el).text().trim();
      const relDuration = $(".fd-infor .fdi-duration", el).text().trim();
      const relMediaType = $(".fd-infor .fdi-type", el).text().trim();

      if (relId && relTitle) {
        related.push({
          id: relId,
          type: relType,
          poster: relPoster,
          title: relTitle,
          year: relYear,
          duration: relDuration,
          mediaType: relMediaType,
        });
      }
    });

    return {
      id: numericId,
      fullId: id,
      type,
      title,
      poster,
      banner,
      description,
      quality,
      imdb,
      duration,
      trailer,
      country,
      genres,
      released,
      production,
      cast,
      related,
    };
  } catch (e) {
    console.error("Error extracting media info:", e.message);
    return null;
  }
}

export default extractMediaInfo;
