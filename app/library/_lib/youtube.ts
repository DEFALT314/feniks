// YouTube video id from the link stored in materialy.film; null for anything else
const ID = /^[\w-]{11}$/;

export function youTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^(www\.|m\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = parsed.pathname.slice(1);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id =
      parsed.searchParams.get("v") ??
      parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] ??
      null;
  }
  return id && ID.test(id) ? id : null;
}

// youtube-nocookie: no tracking cookies until the viewer presses play; captions on when available
export function embedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&cc_load_policy=1&hl=pl&rel=0`;
}

export function thumbnailUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
