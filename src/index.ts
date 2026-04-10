import 'dotenv/config';

// Log startup info
console.log('=== Starting Notion Recall Backend ===');
console.log('Node version:', process.version);
console.log('Environment variables check:');
console.log('- NOTION_TOKEN:', process.env.NOTION_TOKEN ? '✓ Set' : '✗ Missing');
console.log('- NOTION_PAGE_ID:', process.env.NOTION_PAGE_ID ? '✓ Set' : '✗ Missing');
console.log('- PORT:', process.env.PORT || '3000 (default)');

if (!process.env.NOTION_TOKEN) {
  console.error('\n❌ ERROR: NOTION_TOKEN environment variable is required!');
  console.error('Please set it in Railway dashboard.\n');
}

if (!process.env.NOTION_PAGE_ID) {
  console.error('\n❌ ERROR: NOTION_PAGE_ID environment variable is required!');
  console.error('Please set it in Railway dashboard.\n');
}

import './server';
