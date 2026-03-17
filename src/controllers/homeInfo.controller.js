import getSpotlights from "../extractors/spotlight.extractor.js";
import getTrending from "../extractors/trending.extractor.js";
import extractPage from "../helper/extractPages.helper.js";

export const getHomeInfo = async (req, res) => {
  try {
    const [
      spotlights,
      trending,
      latestMovies,
      latestTvShows,
    ] = await Promise.all([
      getSpotlights(),
      getTrending(),
      extractPage(1, "movie"),
      extractPage(1, "tv-show"),
    ]);

    return {
      spotlights,
      trending,
      latestMovies: latestMovies[0],
      latestTvShows: latestTvShows[0],
    };
  } catch (error) {
    console.error("Error fetching home info:", error);
    return error;
  }
};
