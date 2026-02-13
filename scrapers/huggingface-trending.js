#!/usr/bin/env node
/**
 * Hugging Face Trending Scraper
 * Monitors trending models, spaces, and datasets on Hugging Face
 * Useful for tracking open-source AI momentum
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'huggingface-trending.json');

// Hugging Face API endpoints
const HF_API_BASE = 'https://huggingface.co/api';

async function fetchTopModels(sortBy = 'likes', limit = 30) {
  // Valid sort options: downloads, likes, lastModified
  const url = `${HF_API_BASE}/models?sort=${sortBy}&limit=${limit}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Briefing/1.0 (+https://kell.cx)'
      }
    });
    
    if (!res.ok) {
      console.error(`Failed to fetch models (${sortBy}): ${res.status}`);
      return [];
    }
    
    const models = await res.json();
    
    return models.map(model => ({
      id: model.id || model.modelId,
      author: model.id?.split('/')[0] || model.author,
      type: 'model',
      pipeline: model.pipeline_tag || 'unknown',
      downloads: model.downloads || 0,
      likes: model.likes || 0,
      tags: (model.tags || []).filter(t => !t.startsWith('arxiv:')).slice(0, 5),
      createdAt: model.createdAt,
      url: `https://huggingface.co/${model.id || model.modelId}`
    }));
  } catch (err) {
    console.error(`Error fetching models: ${err.message}`);
    return [];
  }
}

async function fetchTopSpaces(sortBy = 'likes', limit = 20) {
  const url = `${HF_API_BASE}/spaces?sort=${sortBy}&limit=${limit}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Briefing/1.0 (+https://kell.cx)'
      }
    });
    
    if (!res.ok) {
      console.error(`Failed to fetch spaces (${sortBy}): ${res.status}`);
      return [];
    }
    
    const spaces = await res.json();
    
    return spaces.map(space => ({
      id: space.id,
      author: space.id?.split('/')[0] || space.author,
      type: 'space',
      sdk: space.sdk || 'unknown',
      likes: space.likes || 0,
      tags: (space.tags || []).slice(0, 5),
      createdAt: space.createdAt,
      url: `https://huggingface.co/spaces/${space.id}`
    }));
  } catch (err) {
    console.error(`Error fetching spaces: ${err.message}`);
    return [];
  }
}

async function fetchTopDatasets(sortBy = 'likes', limit = 15) {
  const url = `${HF_API_BASE}/datasets?sort=${sortBy}&limit=${limit}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Briefing/1.0 (+https://kell.cx)'
      }
    });
    
    if (!res.ok) {
      console.error(`Failed to fetch datasets (${sortBy}): ${res.status}`);
      return [];
    }
    
    const datasets = await res.json();
    
    return datasets.map(ds => ({
      id: ds.id,
      author: ds.id?.split('/')[0] || ds.author,
      type: 'dataset',
      downloads: ds.downloads || 0,
      likes: ds.likes || 0,
      tags: (ds.tags || []).slice(0, 5),
      createdAt: ds.createdAt,
      url: `https://huggingface.co/datasets/${ds.id}`
    }));
  } catch (err) {
    console.error(`Error fetching datasets: ${err.message}`);
    return [];
  }
}

async function fetchNewModelsToday() {
  // Get models created/updated in the last 24 hours
  const url = `${HF_API_BASE}/models?sort=lastModified&direction=-1&limit=20`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Briefing/1.0 (+https://kell.cx)'
      }
    });
    
    if (!res.ok) {
      console.error(`Failed to fetch new models: ${res.status}`);
      return [];
    }
    
    const models = await res.json();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    return models
      .filter(m => new Date(m.lastModified) > oneDayAgo)
      .map(model => ({
        id: model.id || model.modelId,
        author: model.author,
        pipeline: model.pipeline_tag || 'unknown',
        downloads: model.downloads || 0,
        likes: model.likes || 0,
        lastModified: model.lastModified,
        url: `https://huggingface.co/${model.id || model.modelId}`
      }));
  } catch (err) {
    console.error(`Error fetching new models: ${err.message}`);
    return [];
  }
}

async function main() {
  console.log('Fetching Hugging Face data...');
  
  // Fetch all data in parallel - both by likes (popular) and recent activity
  const [
    topModelsByLikes,
    topModelsByDownloads,
    topSpaces,
    topDatasets,
    recentModels
  ] = await Promise.all([
    fetchTopModels('likes', 30),
    fetchTopModels('downloads', 30),
    fetchTopSpaces('likes', 20),
    fetchTopDatasets('likes', 15),
    fetchNewModelsToday()
  ]);
  
  // Compute pipeline distribution
  const modelPipelines = {};
  topModelsByLikes.forEach(m => {
    modelPipelines[m.pipeline] = (modelPipelines[m.pipeline] || 0) + 1;
  });
  
  // Find top authors
  const topAuthors = {};
  [...topModelsByLikes, ...topSpaces].forEach(item => {
    if (item.author) {
      topAuthors[item.author] = (topAuthors[item.author] || 0) + 1;
    }
  });
  
  const sortedAuthors = Object.entries(topAuthors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([author, count]) => ({ author, count }));
  
  const output = {
    scraped_at: new Date().toISOString(),
    source: 'huggingface.co',
    summary: {
      total_top_models: topModelsByLikes.length,
      total_top_spaces: topSpaces.length,
      total_top_datasets: topDatasets.length,
      recent_models_24h: recentModels.length,
      top_pipelines: Object.entries(modelPipelines)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      top_authors: sortedAuthors
    },
    top_models_by_likes: topModelsByLikes,
    top_models_by_downloads: topModelsByDownloads.slice(0, 15), // Top 15 by downloads
    top_spaces: topSpaces,
    top_datasets: topDatasets,
    recent_models_24h: recentModels
  };
  
  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  
  console.log(`✅ Hugging Face data saved to ${OUTPUT_FILE}`);
  console.log(`   - ${topModelsByLikes.length} top models (by likes)`);
  console.log(`   - ${topSpaces.length} top spaces`);
  console.log(`   - ${topDatasets.length} top datasets`);
  console.log(`   - ${recentModels.length} models updated in last 24h`);
  
  // Return summary for use in other scripts
  return output;
}

main().catch(console.error);
