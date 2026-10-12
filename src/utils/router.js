/**
 * Modern HTML5 History API Router for VexM Music.
 * Translates between internal route identifiers and clean, standard URL paths (no #).
 * Fully backward-compatible with legacy hash URLs (#search, #album:..., etc.).
 */

function safeDecode(str) {
  try {
    return decodeURIComponent(str);
  } catch {
    return str || '';
  }
}

/**
 * Converts internal route string (e.g. 'search', 'album:Name') to clean URL path (e.g. '/search', '/album/Name')
 */
export function routeToPath(route, searchParams = '') {
  if (!route || route === 'home') return searchParams ? `/?${searchParams}` : '/';
  if (route === 'search') return searchParams ? `/search?${searchParams}` : '/search';
  if (route === 'library') return '/library';
  if (route === 'liked') return '/liked';
  if (route === 'albums') return '/albums';
  if (route === 'artists') return '/artists';
  if (route === 'recaps') return '/recaps';
  if (route === 'admin') return '/admin';
  if (route === 'settings') return '/settings';

  if (route.startsWith('album:')) {
    const raw = route.slice(6);
    const decoded = safeDecode(raw);
    return `/album/${encodeURIComponent(decoded)}`;
  }

  if (route.startsWith('artist:')) {
    const raw = route.slice(7);
    const decoded = safeDecode(raw);
    return `/artist/${encodeURIComponent(decoded)}`;
  }

  if (route.startsWith('playlist:')) {
    const id = route.slice(9);
    return `/playlist/${encodeURIComponent(safeDecode(id))}`;
  }

  if (route.startsWith('track:')) {
    const id = route.slice(6);
    return `/track/${encodeURIComponent(safeDecode(id))}`;
  }

  if (route.startsWith('settings:')) {
    const tab = route.slice(9);
    return `/settings/${encodeURIComponent(safeDecode(tab))}`;
  }

  // If already formatted like a path:
  if (route.startsWith('/')) return route;
  return `/${route}`;
}

/**
 * Parses clean URL pathname or legacy hash into internal route identifier
 */
export function pathToRoute(pathname = '', hash = '') {
  // 1. Check legacy hash first for backward compatibility (e.g. #search, #/search, #album:Leo)
  const cleanHash = (hash || '').replace(/^#\/?/, '').trim();
  if (cleanHash) {
    if (cleanHash.startsWith('/')) {
      return pathToRoute(cleanHash, '');
    }
    if (
      cleanHash === 'home' ||
      cleanHash === 'search' ||
      cleanHash === 'library' ||
      cleanHash === 'liked' ||
      cleanHash === 'albums' ||
      cleanHash === 'artists' ||
      cleanHash === 'recaps' ||
      cleanHash === 'admin' ||
      cleanHash === 'settings' ||
      cleanHash.startsWith('album:') ||
      cleanHash.startsWith('artist:') ||
      cleanHash.startsWith('playlist:') ||
      cleanHash.startsWith('track:') ||
      cleanHash.startsWith('settings:')
    ) {
      return cleanHash;
    }
  }

  // 2. Parse clean pathname
  const path = (pathname || '/').trim();
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 0) {
    return 'home';
  }

  const [first, ...rest] = segments;
  const param = safeDecode(rest.join('/'));

  switch (first.toLowerCase()) {
    case 'search':
      return 'search';
    case 'library':
      return 'library';
    case 'liked':
      return 'liked';
    case 'albums':
      return 'albums';
    case 'album':
      return param ? `album:${param}` : 'albums';
    case 'artists':
      return 'artists';
    case 'artist':
      return param ? `artist:${param}` : 'artists';
    case 'playlist':
      return param ? `playlist:${param}` : 'library';
    case 'track':
      return param ? `track:${param}` : 'home';
    case 'settings':
      return param ? `settings:${param}` : 'settings';
    case 'admin':
      return 'admin';
    case 'recaps':
      return 'recaps';
    default:
      return 'home';
  }
}
