import getSuggestion from "../extractors/suggestion.extractor.js";

export const getSuggestions = async (req) => {
  try {
    const keyword = req.query.keyword || "";
    if (!keyword) return [];
    const data = await getSuggestion(encodeURIComponent(keyword));
    return data;
  } catch (e) {
    console.error(e);
    return e;
  }
};
