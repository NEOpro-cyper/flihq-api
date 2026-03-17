import { extractServers, extractMovieServers } from "../extractors/streamInfo.extractor.js";

export const getServers = async (req) => {
  try {
    // For TV episode: /api/servers/1676371
    // For movie:      /api/servers/138514?type=movie
    const { id } = req.params;
    const type = req.query.type || "tv";

    if (!id) throw new Error("Missing id param");

    const servers = type === "movie"
      ? await extractMovieServers(id)
      : await extractServers(id);

    return servers;
  } catch (e) {
    console.error(e);
    return e;
  }
};
