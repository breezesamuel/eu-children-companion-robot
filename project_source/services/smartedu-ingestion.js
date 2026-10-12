/**
 * SmartEdu Content Ingestion Service
 * Maps Chinese National Curriculum (国家中小学智慧教育平台) to European Grade Levels
 * Source: basic.smartedu.cn (Ministry of Education, PRC)
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Subject mapping: Chinese -> European standard subjects
const SUBJECT_MAP = {
  '语文': { en: 'Language Arts', zh: '语文', eu: 'language' },
  '数学': { en: 'Mathematics', zh: '数学', eu: 'math' },
  '英语': { en: 'English', zh: '英语', eu: 'english' },
  '物理': { en: 'Physics', zh: '物理', eu: 'physics' },
  '化学': { en: 'Chemistry', zh: '化学', eu: 'chemistry' },
  '生物': { en: 'Biology', zh: '生物', eu: 'biology' },
  '科学': { en: 'Science', zh: '科学', eu: 'science' },
  '历史': { en: 'History', zh: '历史', eu: 'history' },
  '地理': { en: 'Geography', zh: '地理', eu: 'geography' },
  '政治': { en: 'Politics', zh: '政治', eu: 'social' },
  '道德与法治': { en: 'Civics & Ethics', zh: '道德与法治', eu: 'social' },
  '音乐': { en: 'Music', zh: '音乐', eu: 'art' },
  '美术': { en: 'Art', zh: '美术', eu: 'art' },
  '艺术': { en: 'Arts', zh: '艺术', eu: 'art' },
  '体育': { en: 'Physical Education', zh: '体育', eu: 'pe' },
  '信息': { en: 'Information Technology', zh: '信息技术', eu: 'technology' },
  '技术': { en: 'Technology', zh: '技术', eu: 'technology' }
};

// Grade mapping: Chinese -> European ISCED levels
const GRADE_MAPPING = {
  // Chinese Primary (小学 Grade 1-6) -> European Primary (ISCED 1)
  'Grade 1': { eu: 'primary_1', age: 6, section: 'primary', isced: 1 },
  'Grade 2': { eu: 'primary_2', age: 7, section: 'primary', isced: 1 },
  'Grade 3': { eu: 'primary_3', age: 8, section: 'primary', isced: 1 },
  'Grade 4': { eu: 'primary_4', age: 9, section: 'primary', isced: 1 },
  'Grade 5': { eu: 'primary_5', age: 10, section: 'primary', isced: 1 },
  'Grade 6': { eu: 'primary_6', age: 11, section: 'primary', isced: 1 },
  // Chinese Middle (初中 Grade 7-9) -> European Lower Secondary (ISCED 2)
  'Grade 7': { eu: 'secondary_lower_1', age: 12, section: 'secondary', isced: 2 },
  'Grade 8': { eu: 'secondary_lower_2', age: 13, section: 'secondary', isced: 2 },
  'Grade 9': { eu: 'secondary_lower_3', age: 14, section: 'secondary', isced: 2 },
  // Chinese High (高中 Grade 10-12) -> European Upper Secondary (ISCED 3)
  'Grade 10': { eu: 'secondary_upper_1', age: 15, section: 'secondary', isced: 3 },
  'Grade 11': { eu: 'secondary_upper_2', age: 16, section: 'secondary', isced: 3 },
  'Grade 12': { eu: 'secondary_upper_3', age: 17, section: 'secondary', isced: 3 }
};

class SmartEduIngestion {
  constructor() {
    this.dataPath = path.join(__dirname, '../data/smartedu-textbooks.json');
    this.catalog = this._loadCatalog();
    this.mappedContent = this._mapToEuropean();
    logger.info('SmartEduIngestion initialized', { totalTextbooks: this.catalog?.total_textbooks || 0 });
  }

  _loadCatalog() {
    try {
      if (!fs.existsSync(this.dataPath)) {
        logger.warn('SmartEdu catalog not found', { path: this.dataPath });
        return null;
      }
      const raw = fs.readFileSync(this.dataPath, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      logger.error('Failed to load SmartEdu catalog', { error: err.message });
      return null;
    }
  }

  _mapToEuropean() {
    if (!this.catalog || !this.catalog.summary) return { byLevel: {}, bySubject: {}, total: 0 };

    const result = { byLevel: {}, bySubject: {}, total: 0 };

    // Map Chinese stages to European levels
    const stageMapping = {
      '小学': 'primary',
      '初中': 'secondary_lower',
      '高中': 'secondary_upper'
    };

    for (const [cnStage, subjects] of Object.entries(this.catalog.summary)) {
      const euSection = stageMapping[cnStage] || cnStage;

      for (const [cnSubject, versions] of Object.entries(subjects)) {
        const subjectInfo = SUBJECT_MAP[cnSubject] || { en: cnSubject, zh: cnSubject, eu: cnSubject };
        const euSubject = subjectInfo.eu;

        for (const [version, grades] of Object.entries(versions)) {
          for (const [cnGrade, books] of Object.entries(grades)) {
            const gradeMap = GRADE_MAPPING[cnGrade];
            if (!gradeMap) continue;

            const euLevel = gradeMap.eu;
            const key = `${euLevel}_${euSubject}`;

            if (!result.byLevel[euLevel]) result.byLevel[euLevel] = {};
            if (!result.byLevel[euLevel][euSubject]) result.byLevel[euLevel][euSubject] = [];

            if (!result.bySubject[euSubject]) result.bySubject[euSubject] = {};
            if (!result.bySubject[euSubject][euLevel]) result.bySubject[euSubject][euLevel] = [];

            for (const book of books) {
              const mapped = {
                contentId: book.contentId,
                title: book.title,
                semester: book.semester,
                originalSubject: cnSubject,
                originalGrade: cnGrade,
                originalStage: cnStage,
                version: version,
                euLevel: euLevel,
                euSubject: euSubject,
                euSubjectName: subjectInfo.en,
                age: gradeMap.age,
                isced: gradeMap.isced,
                pdf_url: `https://r3-ndr.ykt.cbern.com.cn/edu_product/esp/assets/${book.contentId}.pkg/pdf.pdf`
              };
              result.byLevel[euLevel][euSubject].push(mapped);
              result.bySubject[euSubject][euLevel].push(mapped);
              result.total++;
            }
          }
        }
      }
    }

    return result;
  }

  // Get textbooks for a European grade level
  getForLevel(euLevelId) {
    return this.mappedContent.byLevel[euLevelId] || {};
  }

  // Get textbooks for a European subject
  getForSubject(euSubject) {
    return this.mappedContent.bySubject[euSubject] || {};
  }

  // Get textbooks for a specific level and subject
  getForLevelAndSubject(euLevelId, euSubject) {
    return this.mappedContent.byLevel[euLevelId]?.[euSubject] || [];
  }

  // Get all textbooks
  getAll() {
    return this.mappedContent;
  }

  // Get statistics
  getStats() {
    const stats = { total: this.mappedContent.total, byLevel: {}, bySubject: {} };
    for (const [level, subjects] of Object.entries(this.mappedContent.byLevel)) {
      stats.byLevel[level] = {};
      for (const [subject, books] of Object.entries(subjects)) {
        stats.byLevel[level][subject] = books.length;
      }
    }
    for (const [subject, levels] of Object.entries(this.mappedContent.bySubject)) {
      stats.bySubject[subject] = {};
      for (const [level, books] of Object.entries(levels)) {
        stats.bySubject[subject][level] = books.length;
      }
    }
    return stats;
  }

  // Get PDF URL for a textbook
  getPdfUrl(contentId) {
    return `https://r3-ndr.ykt.cbern.com.cn/edu_product/esp/assets/${contentId}.pkg/pdf.pdf`;
  }

  // Search textbooks
  search(query, options = {}) {
    const { level, subject, version, limit = 20 } = options;
    let results = [];

    for (const [euLevel, subjects] of Object.entries(this.mappedContent.byLevel)) {
      if (level && euLevel !== level) continue;
      for (const [euSubject, books] of Object.entries(subjects)) {
        if (subject && euSubject !== subject) continue;
        for (const book of books) {
          if (version && book.version !== version) continue;
          if (query && !book.title.toLowerCase().includes(query.toLowerCase()) &&
              !book.originalSubject.includes(query)) continue;
          results.push(book);
        }
      }
    }

    return results.slice(0, limit);
  }

  // Get recommended content for a child based on age and interests
  getForChild(age, preferredSubject, limit = 10) {
    const curriculum = require('./european-curriculum');
    const level = curriculum.getLevelByAge(age);
    if (!level) return [];

    const euLevelId = level.id;
    let books = [];

    if (preferredSubject && this.mappedContent.byLevel[euLevelId]?.[preferredSubject]) {
      books = this.mappedContent.byLevel[euLevelId][preferredSubject];
    } else {
      // Get all subjects for this level
      for (const [subject, bookList] of Object.entries(this.mappedContent.byLevel[euLevelId] || {})) {
        books = books.concat(bookList);
      }
    }

    return books.slice(0, limit);
  }
}

module.exports = new SmartEduIngestion();
module.exports.SmartEduIngestion = SmartEduIngestion;
