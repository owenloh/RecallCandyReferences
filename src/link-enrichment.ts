import { EnrichedLink, Chunk } from './types';

// Default timeout for link enrichment
const DEFAULT_TIMEOUT = 3000;

// Fetch page metadata with timeout
async function fetchWithTimeout(url: string, timeout: number = DEFAULT_TIMEOUT): Promise<Response | null> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Notion-Recall-Bot/1.0',
      },
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    console.warn(`Failed to fetch ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

// Extract HTML content (simple parser, no external dependencies)
function extractHtmlContent(html: string): { title?: string; description?: string } {
  const result: { title?: string; description?: string } = {};

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    result.title = titleMatch[1].trim();
  }

  // Extract meta description
  const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  if (metaDescMatch && metaDescMatch[1]) {
    result.description = metaDescMatch[1].trim();
  }

  return result;
}

// Extract YouTube video ID from URL
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([0-9A-Za-z_-]{11})/,
    /youtube\.com\/embed\/([0-9A-Za-z_-]{11})/,
    /youtube\.com\/v\/([0-9A-Za-z_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

// Fetch YouTube transcript
async function fetchYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    // Use dynamic import for ES Module
    const { YoutubeTranscript } = await (Function('return import("youtube-transcript")')() as Promise<any>);
    
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (!transcript || transcript.length === 0) {
      return null;
    }

    // Get first ~500 characters of transcript
    const fullText = transcript.map((item: { text: string }) => item.text).join(' ');
    const snippet = fullText.substring(0, 500);
    
    return snippet + (fullText.length > 500 ? '...' : '');
  } catch (error) {
    // Silently fail - transcripts are optional
    return null;
  }
}

// Enrich a single link
export async function enrichLink(link: EnrichedLink, timeout: number = DEFAULT_TIMEOUT): Promise<EnrichedLink> {
  const enriched = { ...link };

  try {
    // Fetch page metadata
    const response = await fetchWithTimeout(link.url, timeout);

    if (!response || !response.ok) {
      return enriched;
    }

    const html = await response.text();

    // Extract metadata
    const metadata = extractHtmlContent(html);
    if (metadata.title) enriched.title = metadata.title;
    if (metadata.description) enriched.description = metadata.description;

    // Special note for YouTube (no transcript for now)
    if (link.domain.includes('youtube.com') || link.domain.includes('youtu.be')) {
      const videoId = extractYouTubeId(link.url);
      if (videoId && !enriched.title) {
        enriched.title = `[YouTube: ${videoId}]`;
      }
    }

  } catch (error) {
    console.warn(`Error enriching link ${link.url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return enriched;
}

// Enrich all links in a chunk
export async function enrichChunkLinks(chunk: Chunk, timeout: number = DEFAULT_TIMEOUT): Promise<Chunk> {
  if (chunk.links.length === 0) {
    return chunk;
  }

  const enrichedLinks = await Promise.all(
    chunk.links.map(link => enrichLink(link, timeout))
  );

  return {
    ...chunk,
    links: enrichedLinks,
  };
}
