package com.example.robot.repository;

import com.example.robot.entity.ContentItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ContentItemRepository extends JpaRepository<ContentItem, Long> {

    List<ContentItem> findBySubject(String subject);

    List<ContentItem> findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(String title, String description);

    List<ContentItem> findByAgeRange(String ageRange);

    List<ContentItem> findByContentType(String contentType);

    List<ContentItem> findByCategory(String category);

    List<ContentItem> findByStatus(String status);

    List<ContentItem> findByLanguage(String language);

    List<ContentItem> findByDifficulty(String difficulty);

    @Query("SELECT c FROM ContentItem c WHERE c.ageRange LIKE %:ageRange%")
    List<ContentItem> findByAgeRangeContaining(@Param("ageRange") String ageRange);

    @Query("SELECT c FROM ContentItem c WHERE LOWER(c.title) LIKE LOWER(CONCAT('%', :title, '%'))")
    List<ContentItem> searchByTitle(@Param("title") String title);

    @Query("SELECT c FROM ContentItem c WHERE :tag MEMBER OF c.tags")
    List<ContentItem> findByTagsContains(@Param("tag") String tag);

    List<ContentItem> findByRatingGreaterThanEqual(Double rating);

    List<ContentItem> findTopByOrderByViewCountDesc();

    @Query("SELECT c FROM ContentItem c WHERE c.isPublished = true ORDER BY c.viewCount DESC")
    List<ContentItem> findTrendingContent();

    @Query("SELECT c FROM ContentItem c WHERE c.subject = :subject AND c.difficultyLevel <= :maxDifficulty AND c.isPublished = true")
    List<ContentItem> findRecommendedBySubjectAndDifficulty(@Param("subject") String subject, @Param("maxDifficulty") Integer maxDifficulty);

    long countBySubject(String subject);

    long countByStatus(String status);

    long countByIsPublished(Boolean isPublished);

    @Query("SELECT DISTINCT c.subject FROM ContentItem c")
    List<String> findDistinctSubjects();
}
