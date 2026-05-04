import express from 'express';
import { getHistory, getHistoryFilePath } from './history';
import { createChunks, formatChunkForResponse, formatChunkForDebug } from './chunking';
import { enrichChunkLinks } from './link-enrichment';
import { fetchPageBlocks, parseBlocksToChunks } from './notion';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint - show all chunks
app.get('/debug/chunks', async (req, res) => {
  try {
    const pageId = process.env.NOTION_PAGE_ID;

    if (!pageId) {
      return res.status(500).json({ error: 'NOTION_PAGE_ID not configured' });
    }

    const blocks = await fetchPageBlocks(pageId);
    const rawChunks = parseBlocksToChunks(blocks);
    const allChunks = createChunks(rawChunks.join('\n\n'));

    const debugOutput = allChunks.map((chunk, index) => formatChunkForDebug(chunk, index)).join('\n\n');

    res.status(200).send(debugOutput);
  } catch (error) {
    console.error('Error in /debug/chunks:', error);
    res.status(500).json({ error: 'Failed to fetch chunks' });
  }
});

// Stats endpoint - show chunk count and history
app.get('/stats', async (req, res) => {
  try {
    const pageId = process.env.NOTION_PAGE_ID;
    const historySize = parseInt(process.env.HISTORY_SIZE || '10', 10);

    if (!pageId) {
      return res.status(500).json({ error: 'NOTION_PAGE_ID not configured' });
    }

    const history = getHistory(historySize);
    const blocks = await fetchPageBlocks(pageId);
    const rawChunks = parseBlocksToChunks(blocks);
    const allChunks = createChunks(rawChunks.join('\n\n'));

    res.status(200).json({
      totalBlocks: blocks.length,
      totalChunks: allChunks.length,
      recentlyServed: history.getAll(),
      availableChunks: allChunks.length - history.getAll().length,
    });
  } catch (error) {
    console.error('Error in /stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Main prompt endpoint
app.get('/prompt', async (req, res) => {
  try {
    const pageId = process.env.NOTION_PAGE_ID;
    const historySize = parseInt(process.env.HISTORY_SIZE || '10', 10);
    const linkTimeout = parseInt(process.env.LINK_TIMEOUT || '3000', 10);

    if (!pageId) {
      return res.status(500).json({ error: 'NOTION_PAGE_ID not configured' });
    }

    const history = getHistory(historySize);

    // Fetch and parse blocks
    const blocks = await fetchPageBlocks(pageId);
    const rawChunks = parseBlocksToChunks(blocks);
    const allChunks = createChunks(rawChunks.join('\n\n'));

    if (allChunks.length === 0) {
      return res.status(404).json({ error: 'No chunks found in Notion page' });
    }

    // Filter out recently served chunks
    const availableChunks = allChunks.filter(chunk => !history.has(chunk.id));

    // If all chunks have been served, reset history
    const chunksToServe = availableChunks.length > 0 ? availableChunks : allChunks;

    if (chunksToServe.length === 0) {
      return res.status(500).json({ error: 'No chunks available' });
    }

    // Select a chunk randomly (not deterministic)
    const chunkIndex = Math.floor(Math.random() * chunksToServe.length);
    const selectedChunk = chunksToServe[chunkIndex];

    // Enrich links
    const enrichedChunk = await enrichChunkLinks(selectedChunk, linkTimeout);

    // Add to history
    history.add(selectedChunk.id);
    history.persist(getHistoryFilePath());

    // Format response
    const responseText = formatChunkForResponse(enrichedChunk);

    res.status(200).send(responseText);
  } catch (error) {
    console.error('Error in /prompt:', error);
    res.status(500).json({ error: 'Failed to fetch prompt' });
  }
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✓ Server running on port ${PORT}`);
  console.log(`✓ Health: http://localhost:${PORT}/health`);
  console.log(`✓ Prompt: http://localhost:${PORT}/prompt`);
  console.log(`✓ Debug: http://localhost:${PORT}/debug/chunks\n`);
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
