import { Client } from '@notionhq/client';
import { NotionBlock, TextBlock, ChildPageBlock, ChildDatabaseBlock, RichText } from './types';

// Initialize Notion client lazily
let notionClient: Client | null = null;

function getNotionClient(): Client {
  if (!notionClient) {
    notionClient = new Client({
      auth: process.env.NOTION_TOKEN,
    });
  }
  return notionClient;
}

// Fetch all blocks from a page (handles pagination)
export async function fetchPageBlocks(pageId: string): Promise<NotionBlock[]> {
  const notion = getNotionClient();
  const blocks: NotionBlock[] = [];
  let nextCursor: string | null = null;

  try {
    do {
      const response = await notion.blocks.children.list({
        block_id: pageId,
        start_cursor: nextCursor || undefined,
      });

      blocks.push(...(response.results as NotionBlock[]));

      nextCursor = response.next_cursor;
    } while (nextCursor !== null);

    return blocks;
  } catch (error) {
    console.error('Error fetching Notion blocks:', error);
    throw new Error(`Failed to fetch Notion page blocks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Extract plain text from rich text array
export function extractPlainText(richText: RichText[]): string {
  return richText.map(rt => {
    if (rt.type === 'text' && rt.text) {
      // Check if text has a link
      if (rt.text.link?.url) {
        return `${rt.text.content} (${rt.text.link.url})`;
      }
      return rt.text.content;
    }
    if (rt.type === 'mention') {
      if (rt.mention?.type === 'date' && rt.mention.date) {
        return rt.mention.date.start;
      }
      if (rt.mention?.type === 'link_to_page' && rt.mention.link_to_page) {
        return '[link to page]';
      }
      // Check if mention has href (external link)
      if (rt.href) {
        return rt.href;
      }
      return rt.plain_text || '[mention]';
    }
    if (rt.type === 'equation' && rt.equation) {
      return `(${rt.equation.expression})`;
    }
    return rt.plain_text || '';
  }).join('');
}

// Check if a block is a text-containing block
export function isTextBlock(block: NotionBlock): block is TextBlock {
  const textBlockTypes = ['paragraph', 'heading_1', 'heading_2', 'heading_3', 'toggle'];
  return textBlockTypes.includes(block.type);
}

// Check if a block is a child page (to be ignored)
export function isChildPageBlock(block: NotionBlock): block is ChildPageBlock {
  return block.type === 'child_page';
}

// Check if a block is a child database (to be ignored)
export function isChildDatabaseBlock(block: NotionBlock): block is ChildDatabaseBlock {
  return block.type === 'child_database';
}

// Check if a block is a supported text block (not subpage/database)
export function isSupportedTextBlock(block: NotionBlock): boolean {
  return isTextBlock(block) && !isChildPageBlock(block) && !isChildDatabaseBlock(block);
}

// Get text content from a block
export function getBlockText(block: NotionBlock): string {
  if (!isTextBlock(block)) return '';

  const blockType = block.type;
  const content = block[blockType];

  if (content && Array.isArray(content.rich_text)) {
    return extractPlainText(content.rich_text);
  }

  return '';
}

// Parse blocks into a flat array of text content
export function parseBlocksToChunks(blocks: NotionBlock[]): string[] {
  const chunks: string[] = [];
  let currentChunkLines: string[] = [];

  for (const block of blocks) {
    // Skip child pages and databases entirely
    if (isChildPageBlock(block) || isChildDatabaseBlock(block)) {
      continue;
    }

    // Handle toggle blocks specially
    if (block.type === 'toggle') {
      const toggleText = getBlockText(block);
      
      if (toggleText) {
        currentChunkLines.push(toggleText);
      }
      continue;
    }

    // Skip unsupported blocks
    if (!isSupportedTextBlock(block)) {
      continue;
    }

    const text = getBlockText(block);

    if (!text || text.trim() === '') {
      // Empty line - chunk separator
      if (currentChunkLines.length > 0) {
        const chunkText = currentChunkLines.join('\n');
        if (chunkText.trim()) {
          chunks.push(chunkText);
        }
        currentChunkLines = [];
      }
      continue;
    }

    // Keep the text as-is (preserving internal newlines)
    currentChunkLines.push(text);
  }

  // Don't forget the last chunk
  if (currentChunkLines.length > 0) {
    const chunkText = currentChunkLines.join('\n');
    if (chunkText.trim()) {
      chunks.push(chunkText);
    }
  }

  return chunks;
}
