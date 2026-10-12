const ingestion = require('../services/content-ingestion');
const contentService = require('../services/content-service');
const sources = require('../data/content-sources.json');
const logger = require('../utils/logger');

async function main() {
  logger.info('=== Starting web crawl on ALL sources ===');
  
  // Init Playwright first
  const crawlerEngine = require('../services/crawler-engine');
  logger.info('Initializing Playwright...');
  await crawlerEngine.init();
  logger.info('Playwright ready:', crawlerEngine.isReady);

  const sourceIds = sources.sources.map(s => s.id);
  logger.info(`Total sources to crawl: ${sourceIds.length}`);
  
  const results = await ingestion.startBatchCrawl(sourceIds, { maxPages: 20, depth: 2 });
  logger.info('All crawl jobs started:', JSON.stringify(results.map(r => ({sourceId: r.sourceId, jobId: r.jobId, status: r.status}))));
  
  // Wait for all jobs to complete
  const startTime = Date.now();
  const maxWait = 10 * 60 * 1000; // 10 minutes max
  
  while (true) {
    const jobs = ingestion.getAllJobs();
    const active = jobs.filter(j => j.status === 'pending' || j.status === 'crawling');
    const done = jobs.filter(j => j.status === 'completed' || j.status === 'failed');
    
    if (done.length >= sourceIds.length) {
      logger.info(`All ${sourceIds.length} crawls completed (${done.filter(j=>j.status==='completed').length} success, ${done.filter(j=>j.status==='failed').length} failed)`);
      break;
    }
    
    if (Date.now() - startTime > maxWait) {
      logger.warn(`Timeout after ${maxWait/1000}s, ${active.length} jobs still active`);
      break;
    }
    
    await new Promise(r => setTimeout(r, 5000));
    process.stdout.write('.');
  }
  
  const stats = ingestion.getStats();
  logger.info('Ingestion stats:', JSON.stringify(stats));
  
  // Merge scraped content into content service
  await contentService.waitForReady();
  const scraped = ingestion.getScrapedContent();
  logger.info(`Total scraped items: ${scraped.total}`);
  
  if (scraped.total > 0) {
    contentService.mergeScraped(scraped.data);
    await contentService.save();
  }
  
  const contentStats = contentService.getStats();
  logger.info('Final content stats:', JSON.stringify({
    totalItems: contentStats.totalItems,
    totalWords: contentStats.totalWords,
    categories: Object.keys(contentStats.byCategory || {}).length
  }));
  
  // Print per-category breakdown
  const cats = contentStats.byCategory || {};
  for (const [k, v] of Object.entries(cats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }
  
  logger.info('=== Crawl complete ===');
  process.exit(0);
}

main().catch(err => {
  logger.error('Crawl failed:', err);
  process.exit(1);
});
