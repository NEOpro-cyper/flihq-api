import axios from "axios";
import * as cheerio from "cheerio";
import { v1_base_url } from "../utils/base_v1.js";
import { DEFAULT_HEADERS } from "../configs/header.config.js";

export async function fetchServerData_v1(id) {
  try {
    const { data } = await axios.get(
      `https://${v1_base_url}/ajax/episode/servers/${id}`,
      { headers: { ...DEFAULT_HEADERS, "X-Requested-With": "XMLHttpRequest" } }
    );
    const $ = cheerio.load(data);
    const serverData = [];
    $(".nav-item a.link-item").each((_, ele) => {
      const name = $(ele).find("span").text().trim();
      const dataId = $(ele).attr("data-id");
      if (name && dataId) {
        serverData.push({ name, id: dataId });
      }
    });
    return serverData;
  } catch (error) {
    console.error("Error fetching server data:", error.message);
    return [];
  }
}
