// Types for Notion blocks
export interface NotionBlock {
  object: 'block';
  id: string;
  type: string;
  [key: string]: unknown;
}

export interface TextBlock extends NotionBlock {
  type: 'paragraph' | 'heading_1' | 'heading_2' | 'heading_3' | 'toggle';
  paragraph?: {
    rich_text: RichText[];
    [key: string]: unknown;
  };
  heading_1?: {
    rich_text: RichText[];
    [key: string]: unknown;
  };
  heading_2?: {
    rich_text: RichText[];
    [key: string]: unknown;
  };
  heading_3?: {
    rich_text: RichText[];
    [key: string]: unknown;
  };
  toggle?: {
    rich_text: RichText[];
    [key: string]: unknown;
  };
}

export interface ChildPageBlock extends NotionBlock {
  type: 'child_page';
  child_page: {
    title: string;
  };
}

export interface ChildDatabaseBlock extends NotionBlock {
  type: 'child_database';
  child_database: {
    title: string;
  };
}

export interface RichText {
  type: 'text' | 'mention' | 'equation';
  text?: {
    content: string;
    link?: { url: string };
  };
  mention?: {
    type: 'date' | 'user' | 'link_to_page';
    date?: { start: string; end?: string; timezone?: string };
    user?: { object: string; id: string };
    link_to_page?: { object: string; id: string };
  };
  equation?: {
    expression: string;
  };
  annotations?: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: string;
  };
  plain_text: string;
  href?: string;
}

// Enriched link data
export interface EnrichedLink {
  url: string;
  domain: string;
  title?: string;
  description?: string;
  transcriptSnippet?: string;
}

// Chunk with optional enriched links
export interface Chunk {
  id: string;
  text: string;
  links: EnrichedLink[];
}

// API response types
export interface PromptResponse {
  chunk: string;
  linkContext?: string;
}

export interface DebugChunk {
  id: string;
  text: string;
  linkCount: number;
}
