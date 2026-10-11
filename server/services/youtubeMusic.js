/**
 * YouTube Music Innertube Client Service
 * High-performance on-demand search, trending, and metadata parser
 */

const searchCache = new Map();
const trendingCache = { data: null, expiresAt: 0 };
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCleanThumbnail(url, size = 544) {
  if (!url) return '';
  // Upgrade YouTube Music thumbnails to crisp 544x544
  if (url.includes('googleusercontent.com') || url.includes('ggpht.com')) {
    return url.replace(/=w\d+-h\d+.*$/, `=w${size}-h${size}-l90-rj`);
  }
  if (url.includes('ytimg.com')) {
    // hqdefault is 100% guaranteed to exist for all YouTube videos
    return url.replace(/\/(?:maxresdefault|sddefault|default)\.jpg.*$/, '/hqdefault.jpg');
  }
  return url;
}

/**
 * Global Search for Songs, Albums, Artists via YouTube Music Innertube API
 */
async function search(query, limit = 20) {
  const cleanQ = (query || '').trim();
  if (!cleanQ) return [];

  const cacheKey = `search_${cleanQ.toLowerCase()}_${limit}`;
  if (searchCache.has(cacheKey)) {
    const cached = searchCache.get(cacheKey);
    if (Date.now() < cached.expiresAt) {
      return cached.data;
    }
    searchCache.delete(cacheKey);
  }

  const payload = {
    context: {
      client: {
        clientName: 'WEB_REMIX',
        clientVersion: '1.20240901.01.00',
        hl: 'en',
        gl: 'IN',
      },
    },
    query: cleanQ,
  };

  try {
    const res = await fetch('https://music.youtube.com/youtubei/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn('[YTM Search] Response not OK:', res.status);
      return [];
    }

    const data = await res.json();
    const tabs = data.contents?.tabbedSearchResultsRenderer?.tabs || [];
    const sectionList = tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
    const results = [];
    const seenIds = new Set();

    for (const section of sectionList) {
      // 1. Process itemSectionRenderer contents
      const itemSection = section.itemSectionRenderer?.contents;
      const shelfContents = section.musicShelfRenderer?.contents;
      const rawItems = (itemSection || []).concat(shelfContents || []);

      for (const item of rawItems) {
        const r = item?.musicResponsiveListItemRenderer;
        if (!r) continue;

        // Parse title and videoId
        const col0 = r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
        const title = col0?.map(x => x.text).join('').trim();
        const videoId =
          col0?.[0]?.navigationEndpoint?.watchEndpoint?.videoId ||
          r.playlistItemData?.videoId ||
          r.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;

        if (!title || !videoId || seenIds.has(videoId)) continue;
        seenIds.add(videoId);

        // Parse artist, album, duration
        const col1Runs = r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
        let artist = '';
        let album = '';
        let durationStr = '';

        for (const run of col1Runs) {
          const pageType = run.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType;
          if (pageType === 'MUSIC_PAGE_TYPE_ARTIST') {
            artist = artist ? `${artist}, ${run.text}` : run.text;
          } else if (pageType === 'MUSIC_PAGE_TYPE_ALBUM') {
            album = run.text;
          } else if (/^\d+:\d+$/.test(run.text.trim())) {
            durationStr = run.text.trim();
          }
        }

        if (!artist) {
          const nonDelim = col1Runs.map(x => x.text).filter(x => x !== ' • ' && x !== 'Song');
          artist = nonDelim[0] || 'Unknown Artist';
        }

        // Parse duration in seconds
        let duration = 0;
        if (durationStr) {
          const parts = durationStr.split(':').map(Number);
          if (parts.length === 2) duration = parts[0] * 60 + parts[1];
          else if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }

        // Parse artwork
        const rawThumb = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url;
        const thumbnail = getCleanThumbnail(rawThumb, 544);

        results.push({
          id: `yt_${videoId}`,
          videoId,
          title,
          artist,
          album: album || title,
          albumArtist: artist,
          duration,
          durationFormatted: durationStr,
          thumbnail,
          isYouTube: true,
          source: 'youtube_music',
        });

        if (results.length >= limit) break;
      }
      if (results.length >= limit) break;
    }

    // Cache results
    searchCache.set(cacheKey, { data: results, expiresAt: Date.now() + CACHE_TTL_MS });
    if (searchCache.size > 200) {
      const firstKey = searchCache.keys().next().value;
      searchCache.delete(firstKey);
    }

    return results;
  } catch (err) {
    console.error('[YTM Search Error]:', err.message);
    return [];
  }
}

/**
 * Fetch Trending Songs & New Releases for the Home Page
 */
async function getTrending(limit = 20) {
  if (trendingCache.data && Date.now() < trendingCache.expiresAt) {
    return trendingCache.data;
  }

  const payload = {
    context: {
      client: {
        clientName: 'WEB_REMIX',
        clientVersion: '1.20240901.01.00',
        hl: 'en',
        gl: 'IN',
      },
    },
    browseId: 'FEmusic_explore',
  };

  try {
    const res = await fetch('https://music.youtube.com/youtubei/v1/browse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const sectionList = data.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

    const trendingShelf = sectionList.find(s => {
      const title = s.musicCarouselShelfRenderer?.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text;
      return title === 'Trending' || title === 'Top songs' || title?.includes('Trending');
    });

    const rawItems = trendingShelf?.musicCarouselShelfRenderer?.contents || [];
    const results = [];
    const seenIds = new Set();

    for (const item of rawItems) {
      const r = item.musicResponsiveListItemRenderer || item.musicTwoRowItemRenderer;
      if (!r) continue;

      const title =
        r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.map(x => x.text).join('') ||
        r.title?.runs?.[0]?.text;

      const videoId =
        r.playlistItemData?.videoId ||
        r.navigationEndpoint?.watchEndpoint?.videoId ||
        r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;

      if (!title || !videoId || seenIds.has(videoId)) continue;
      seenIds.add(videoId);

      const subtitleRuns =
        r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs ||
        r.subtitle?.runs ||
        [];
      const artist = subtitleRuns.map(x => x.text).join('').replace(/•.*$/, '').trim() || 'Popular Artist';

      const rawThumb =
        r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
        r.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url;

      results.push({
        id: `yt_${videoId}`,
        videoId,
        title: title.replace(/^(.*)\s*-\s*(.*)$/, '$2').trim() || title,
        artist: artist.split('•')[0].trim(),
        album: 'Trending Hit',
        thumbnail: getCleanThumbnail(rawThumb, 544),
        isYouTube: true,
        source: 'youtube_music',
      });

      if (results.length >= limit) break;
    }

    if (results.length === 0) {
      const fallback = await search('top trending music songs hits', limit);
      return fallback;
    }

    trendingCache.data = results;
    trendingCache.expiresAt = Date.now() + 30 * 60 * 1000; // 30 min cache
    return results;
  } catch (err) {
    console.error('[YTM Trending Error]:', err.message);
    try {
      return await search('top hits', limit);
    } catch {
      return [];
    }
  }
}

/**
 * Autocomplete suggestions for search input
 */
async function getSuggestions(query) {
  const cleanQ = (query || '').trim();
  if (!cleanQ) return [];

  try {
    const res = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(cleanQ)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data[1]) ? data[1].slice(0, 8) : [];
  } catch {
    return [];
  }
}

module.exports = {
  search,
  getTrending,
  getSuggestions,
};
