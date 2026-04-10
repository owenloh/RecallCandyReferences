# Notion Recall Backend

Minimal backend service to turn a messy Notion "reference tray" page into a daily active recall source for Apple Shortcuts.

## How It Works

1. Your Notion page contains ~100 chunks of information (mostly flat text separated by empty lines)
2. This backend fetches the page, parses blocks, and splits content into chunks
3. Each request returns one chunk with optional link enrichment
4. Apple Shortcuts fetches the chunk and passes it to ChatGPT for generating a recall cue

## Setup

### 1. Notion Integration

1. Go to [Notion integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Name it (e.g., "Recall Backend")
4. Copy the **Internal Integration Token**
5. Share your target page with the integration (click the three dots on the page → Add connections → select your integration)

### 2. Get Page ID

1. Open your Notion page
2. Right-click and copy the page URL
3. The page ID is the long string before the `?` - something like `https://www.notion.so/yourworkspace/Your-Page-Title-abc123def456?...`
4. The `abc123def456` part is your page ID

### 3. Local Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your Notion token and page ID
# NOTION_TOKEN=your_token
# NOTION_PAGE_ID=your_page_id

# Run locally
npm run dev
```

The server will start on `http://localhost:3000`

### 4. Deployment (Railway)

1. Push code to GitHub
2. Create new project on Railway
3. Connect to your GitHub repo
4. Add environment variables:
   - `NOTION_TOKEN`
   - `NOTION_PAGE_ID`
   - `PORT` (default: 3000)
5. Deploy

## API Endpoints

### GET /health

Simple health check.

### GET /prompt

Returns one chunk as plain text with optional link enrichment.

Example response:
```
CHUNK: Your chunk content here...

OPTIONAL LINK CONTEXT:
[example.com] Example Title - Short description
[youtube.com] Video Title - Transcript snippet if available
```

### GET /debug/chunks (optional)

Shows all parsed chunks for development/inspection.

## Apple Shortcuts Setup

### 1. Create Shortcut

1. Open the Shortcuts app on your iPhone
2. Create a new shortcut
3. Add action: **Get contents of URL**
   - URL: `https://your-deployed-url.com/prompt`

4. Add action: **Get text from input**
   - This extracts the plain text from the response

5. Add action: **Ask ChatGPT**
   - Prompt: 
     ```
     Generate a sharp 6 to 10 word active recall cue from the material below. Prioritise one single clear idea, even if the chunk contains multiple ideas. If multiple sub-ideas exist, choose the most central or most recall-worthy one. Make it concise, specific, and useful for active recall. Do not explain. Output only the cue.
     ```

6. Add action: **Show result** or **Add to widget**

### 2. Schedule Daily

1. Add a **Wait** action (e.g., wait 1 second for processing)
2. Add a **Repeat with each item** if needed
3. Set up a daily automation:
   - Go to Automation tab → Create Automation
   - Choose "Create Personal Automation"
   - Select "Time of Day"
   - Choose your preferred time
   - Add your shortcut
   - Disable "Ask Before Running" for fully automatic

## Tech Notes

- **Chunking**: Splits by empty lines, preserves structure, ignores subpages
- **Link Enrichment**: Lightweight, shallow fetch with timeouts - no AI summarization
- **History**: Avoids recently served chunks (last 10 by default)
- **No authentication**: Designed for simple public deployment behind Railway's protection

## Important Notes

- This backend does NOT use AI/LLM - all intelligence happens on Apple side via ChatGPT
- Link enrichment is optional and shallow - it won't hang if a site is slow
- Subpages in Notion are ignored for v1
- The messy nature of your Notion page is preserved intentionally
