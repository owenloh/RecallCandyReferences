import { Chunk, EnrichedLink } from './types';

// Extract URLs from text
export function extractUrls(text: string): string[] {
  // Simple regex to find URLs - matches http/https URLs
  const urlRegex = /https?:\/\/[^\s<>"']+/g;
  const matches = text.match(urlRegex);
  return matches ? Array.from(new Set(matches)) : [];
}

// Extract domain from URL
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return 'unknown';
  }
}

// Parse chunk text and extract links
export function parseChunk(text: string, id: string): Chunk {
  const urls = extractUrls(text);
  const links: EnrichedLink[] = urls.map(url => ({
    url,
    domain: extractDomain(url),
  }));

  return {
    id,
    text: text, // Keep original text with newlines
    links,
  };
}

// Split raw text into chunks by empty lines
export function splitByEmptyLines(text: string, maxChunkSize: number = 5000): string[] {
  // Split by one or more empty lines
  const rawChunks = text.split(/\n\s*\n/);

  const chunks: string[] = [];

  for (const chunk of rawChunks) {
    const trimmed = chunk.trim();
    
    // Skip empty chunks
    if (!trimmed) continue;

    // If chunk is extremely large, cap it
    let finalChunk = trimmed;
    if (trimmed.length > maxChunkSize) {
      finalChunk = trimmed.substring(0, maxChunkSize) + '... [truncated]';
    }

    chunks.push(finalChunk);
  }

  return chunks;
}

// Create chunks from Notion page text
export function createChunks(pageText: string): Chunk[] {
  const rawChunks = splitByEmptyLines(pageText);
  
  return rawChunks.map((text, index) => ({
    id: `chunk-${index}`,
    text,
    links: [],
  })).map(chunk => parseChunk(chunk.text, chunk.id));
}

// Format chunk for API response
export function formatChunkForResponse(chunk: Chunk): string {
  let result = `CHUNK: ${chunk.text}`;

  if (chunk.links.length > 0) {
    result += '\n\nOPTIONAL LINK CONTEXT:';
    for (const link of chunk.links) {
      if (link.title) {
        result += `\n[${link.domain}] ${link.title}`;
        if (link.description) {
          result += ` - ${link.description}`;
        }
        if (link.transcriptSnippet) {
          result += ` - ${link.transcriptSnippet}`;
        }
      } else {
        result += `\n[${link.domain}] ${link.url}`;
      }
    }
  }

  return result;
}

// Format chunk for debug view
export function formatChunkForDebug(chunk: Chunk, index: number): string {
  return `Chunk ${index} (${chunk.id}):
${chunk.text}
Links: ${chunk.links.length}
`;
}
