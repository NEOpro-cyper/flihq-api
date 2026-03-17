import extractEpisodesList from "../extractors/episodeList.extractor.js";

export const getEpisodes = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) throw new Error("Missing id param");
    const data = await extractEpisodesList(id);
    return data;
  } catch (e) {
    console.error("Error fetching episodes:", e);
    return e;
  }
};
