import extractEpisodesList from "../extractors/episodeList.extractor.js";

export const getEpisodes = async (req, res) => {
  try {
    const { id } = req.params;
    const type = req.query.type || null;
    if (!id) throw new Error("Missing id param");
    const data = await extractEpisodesList(id, type);
    return data;
  } catch (e) {
    console.error("Error fetching episodes:", e);
    return e;
  }
};
