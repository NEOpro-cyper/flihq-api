import axios from "axios";
import * as cheerio from "cheerio";
import { v1_base_url } from "../utils/base_v1.js";
import { DEFAULT_HEADERS } from "../configs/header.config.js";

const axiosInstance = axios.create({ headers: DEFAULT_HEADERS });

async function extractPage(page, params) {
  try {
    const resp = await axiosInstance.get(`https://${v1_base_url}/${params}?page=${page}`);
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

    const data = [];
    $(".film_list-wrap .flw-item").each((index, element) => {
      const anchor = $(".film-poster a", element);
      const href = anchor.attr("href") || "";
      const id = href.split("/").pop();
      const type = href.startsWith("/movie") ? "movie" : "tv";

      const poster = $(".film-poster img", element).attr("data-src") ||
                     $(".film-poster img", element).attr("src");
      const title = $(".film-detail .film-name a", element).text().trim();
      const quality = $(".film-poster-quality", element).text().trim();
      const year = $(".fd-infor .fdi-item:first-child", element).text().trim();
      const duration = $(".fd-infor .fdi-duration", element).text().trim();
      const season = $(".fd-infor .fdi-item:first-child", element).text().trim();
      const episodes = $(".fd-infor .fdi-item:nth-child(3)", element).text().trim();
      const mediaType = $(".fd-infor .fdi-type", element).text().trim();

      if (id && title) {
        data.push({ id, type, poster, title, quality, year, duration, season, episodes, mediaType });
      }
    });

    return [data, parseInt(totalPages, 10)];
  } catch (error) {
    console.error(`Error extracting page ${page} of ${params}:`, error.message);
    throw error;
  }
}

export default extractPage;
