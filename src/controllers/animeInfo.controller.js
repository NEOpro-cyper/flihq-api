import extractMediaInfo from "../extractors/animeInfo.extractor.js";

export const getAnimeInfo = async (req, res) => {
  const { id } = req.query;
  // id = movie/watch-wake-up-dead-man-a-knives-out-mystery-movies-free-138514
  // or  tv/watch-the-madison-movies-free-147781
  try {
    if (!id) throw new Error("Missing id param");
    const data = await extractMediaInfo(id);
    return { data };
  } catch (e) {
    console.error(e);
    return { error: e.message };
  }
};
