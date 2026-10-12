package com.example.robot.service;

import com.example.robot.entity.ContentItem;
import com.example.robot.repository.ContentItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContentService {

    private final ContentItemRepository contentItemRepository;

    @Transactional(readOnly = true)
    public List<ContentItem> getAllContent() {
        return contentItemRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<ContentItem> getContentById(Long id) {
        return contentItemRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public List<ContentItem> getContentBySubject(String subject) {
        return contentItemRepository.findBySubject(subject);
    }

    @Transactional(readOnly = true)
    public List<ContentItem> searchContent(String query) {
        return contentItemRepository.findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(query, query);
    }

    @Transactional(readOnly = true)
    public List<ContentItem> getByCategory(String category) {
        return contentItemRepository.findByCategory(category);
    }

    @Transactional(readOnly = true)
    public List<ContentItem> getByLanguage(String language) {
        return contentItemRepository.findByLanguage(language);
    }

    @Transactional(readOnly = true)
    public List<ContentItem> getByDifficulty(String difficulty) {
        return contentItemRepository.findByDifficulty(difficulty);
    }

    @Transactional(readOnly = true)
    public List<ContentItem> getTrending() {
        return contentItemRepository.findTrendingContent();
    }

    @Transactional(readOnly = true)
    public List<ContentItem> getRecommended(String subject, Integer maxDifficulty) {
        return contentItemRepository.findRecommendedBySubjectAndDifficulty(subject, maxDifficulty);
    }

    @Transactional(readOnly = true)
    public List<ContentItem> getRelated(Long contentId) {
        return contentItemRepository.findById(contentId)
                .map(item -> contentItemRepository.findBySubject(item.getSubject()).stream()
                        .filter(c -> !c.getId().equals(contentId))
                        .limit(10)
                        .toList())
                .orElse(List.of());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCategories() {
        return contentItemRepository.findDistinctSubjects().stream()
                .map(s -> Map.<String, Object>of("subject", s, "count", contentItemRepository.countBySubject(s)))
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getContentStats() {
        long total = contentItemRepository.count();
        long published = contentItemRepository.countByIsPublished(true);
        long draft = contentItemRepository.countByStatus("draft");
        long archived = contentItemRepository.countByStatus("archived");
        var bySubject = contentItemRepository.findDistinctSubjects().stream()
                .collect(Collectors.toMap(s -> s, contentItemRepository::countBySubject));

        return Map.of(
            "total", total,
            "published", published,
            "draft", draft,
            "archived", archived,
            "bySubject", bySubject
        );
    }

    @Transactional
    public ContentItem createContent(ContentItem item) {
        item.setCreatedAt(LocalDateTime.now());
        item.setUpdatedAt(LocalDateTime.now());
        log.info("Creating content: {}", item.getTitle());
        return contentItemRepository.save(item);
    }

    @Transactional
    public ContentItem updateContent(Long id, ContentItem item) {
        return contentItemRepository.findById(id).map(existing -> {
            if (item.getTitle() != null) existing.setTitle(item.getTitle());
            if (item.getDescription() != null) existing.setDescription(item.getDescription());
            if (item.getSubject() != null) existing.setSubject(item.getSubject());
            if (item.getContentType() != null) existing.setContentType(item.getContentType());
            if (item.getAgeRange() != null) existing.setAgeRange(item.getAgeRange());
            if (item.getContent() != null) existing.setContent(item.getContent());
            if (item.getDifficultyLevel() != null) existing.setDifficultyLevel(item.getDifficultyLevel());
            if (item.getIsPublished() != null) existing.setIsPublished(item.getIsPublished());
            if (item.getStatus() != null) existing.setStatus(item.getStatus());
            if (item.getLanguage() != null) existing.setLanguage(item.getLanguage());
            if (item.getDifficulty() != null) existing.setDifficulty(item.getDifficulty());
            if (item.getAuthor() != null) existing.setAuthor(item.getAuthor());
            if (item.getSource() != null) existing.setSource(item.getSource());
            if (item.getMetadata() != null) existing.setMetadata(item.getMetadata());
            if (item.getTags() != null) existing.setTags(item.getTags());
            if (item.getPrerequisites() != null) existing.setPrerequisites(item.getPrerequisites());
            if (item.getLearningObjectives() != null) existing.setLearningObjectives(item.getLearningObjectives());
            existing.setUpdatedAt(LocalDateTime.now());
            log.info("Updating content: {}", existing.getTitle());
            return contentItemRepository.save(existing);
        }).orElseThrow(() -> new IllegalArgumentException("Content not found with id: " + id));
    }

    @Transactional
    public void deleteContent(Long id) {
        contentItemRepository.deleteById(id);
        log.info("Deleted content: {}", id);
    }

    @Transactional
    public void bulkDelete(List<Long> ids) {
        contentItemRepository.deleteAllById(ids);
        log.info("Bulk deleted {} content items", ids.size());
    }

    @Transactional
    public ContentItem rateContent(Long id, Double rating) {
        ContentItem item = contentItemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Content not found"));
        if (item.getRating() == null) {
            item.setRating(rating);
        } else {
            item.setRating((item.getRating() + rating) / 2.0);
        }
        return contentItemRepository.save(item);
    }

    @Transactional
    public ContentItem recordView(Long id) {
        ContentItem item = contentItemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Content not found"));
        item.setViewCount(item.getViewCount() == null ? 1 : item.getViewCount() + 1);
        return contentItemRepository.save(item);
    }

    @Transactional
    public ContentItem categorizeContent(Long id, String category) {
        ContentItem item = contentItemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Content not found"));
        item.setSubject(category);
        return contentItemRepository.save(item);
    }
}
