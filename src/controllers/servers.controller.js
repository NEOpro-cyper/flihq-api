import { extractServers } from "../extractors/streamInfo.extractor.js";

export const getServers = async (req) => {
  try {
    const { id } = req.params;
    if (!id) throw new Error("Missing id param");
    const servers = await extractServers(id);
    return servers;
  } catch (e) {
    console.error(e);
    return e;
  }
};
