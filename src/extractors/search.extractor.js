import axios from "axios";
import * as cheerio from "cheerio";
import { v1_base_url } from "../utils/base_v1.js";
import { DEFAULT_HEADERS } from "../configs/header.config.js";

async function extractSearchResults(params = {}) {
  try {
    const keyword = params.keyword || "";
    const page = params.page || 1;

    // FlixHQ search URL format: /search/{keyword}?page=1
    const searchSlug = keyword.trim().replace(/\s+/g, "-");
    const url = `https://${v1_base_url}/search/${searchSlug}?page=${page}`;

    const resp = await axios.get(url, { headers: DEFAULT_HEADERS });
    const $ = cheerio.load(resp.data);

    const totalPages =
      Number(
        $('.pre-pagination nav .pagination > .page-item a[title="Last"]')
          ?.attr("href")?.split("=").pop() ??
        $('.pre-pagination nav .pagination > .page-item a[title="Next"]')
          ?.attr("href")?.split("=").pop() ??
        $(".pre-pagination nav .pagination > .page-item.active a")
          ?.text()?.trim()
      ) || 1;

    const results = [];

    $(".film_list-wrap .flw-item").each((_, el) => {
      const anchor = $(".film-poster a", el);
      const href = anchor.attr("href") || "";
      const id = href.split("/").pop();
      const type = href.startsWith("/movie") ? "movie" : "tv";
      const poster = $(".film-poster img", el).attr("data-src") ||
                     $(".film-poster img", el).attr("src");
      const title = $(".film-detail .film-name a", el).text().trim();
      const quality = $(".film-poster-quality", el).text().trim();
      const year = $(".fd-infor .fdi-item:first-child", el).text().trim();
      const duration = $(".fd-infor .fdi-duration", el).text().trim();
      const mediaType = $(".fd-infor .fdi-type", el).text().trim();

      if (id && title) {
        results.push({ id, type, poster, title, quality, year, duration, mediaType });
      }
    });

    return [parseInt(totalPages, 10), results];
  } catch (e) {
    console.error("Search error:", e.message);
    throw e;
  }
}

export default extractSearchResults;
