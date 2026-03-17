import { extractStreamingInfo } from "../extractors/streamInfo.extractor.js";
import { extractMovieServers } from "../extractors/streamInfo.extractor.js";

export const getStreamInfo = async (req, res, fallback = false) => {
  try {
    // For movies:  /api/stream?id=12842812&server=UpCloud&type=movie
    // For TV:      /api/stream?id=13228416&server=UpCloud&type=tv
    const id = req.query.id;
    const server = req.query.server || "upcloud";
    const type = req.query.type || "movie";

    if (!id) throw new Error("Missing id param");

    const data = await extractStreamingInfo(id, server, type, fallback);
    return data;
  } catch (e) {
    console.error(e);
    return { error: e.message };
  }
};
