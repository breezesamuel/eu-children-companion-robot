package com.example.robot.repository;

import com.example.robot.entity.LearningRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface LearningRecordRepository extends JpaRepository<LearningRecord, Long> {

    List<LearningRecord> findByChildId(Long childId);

    List<LearningRecord> findByContentId(Long contentId);

    List<LearningRecord> findBySubject(String subject);

    List<LearningRecord> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    List<LearningRecord> findByChildIdAndCreatedAtBetween(Long childId, LocalDateTime start, LocalDateTime end);

    List<LearningRecord> findTop10ByChildIdOrderByCreatedAtDesc(Long childId);

    List<LearningRecord> findByChildIdOrderByCompletedAtDesc(Long childId);

    List<LearningRecord> findByChildIdAndSubject(Long childId, String subject);

    List<LearningRecord> findByChildIdAndDateBetween(Long childId, LocalDateTime start, LocalDateTime end);

    List<LearningRecord> findByScoreGreaterThanEqual(Integer score);

    long countByChildId(Long childId);

    @Query("SELECT AVG(lr.score) FROM LearningRecord lr WHERE lr.child.id = :childId AND lr.score IS NOT NULL")
    Optional<Double> avgScoreByChildId(@Param("childId") Long childId);

    @Query("SELECT COALESCE(SUM(lr.duration), 0) FROM LearningRecord lr WHERE lr.child.id = :childId")
    Long sumDurationByChildId(@Param("childId") Long childId);

    List<LearningRecord> findByStatus(String status);

    @Query("SELECT lr FROM LearningRecord lr WHERE lr.child.id = :childId ORDER BY lr.createdAt DESC")
    List<LearningRecord> findRecentByChildId(@Param("childId") Long childId);

    @Query("SELECT lr FROM LearningRecord lr WHERE lr.child.id = :childId AND lr.completedAt IS NOT NULL ORDER BY lr.completedAt DESC")
    List<LearningRecord> findCompletedByChildId(@Param("childId") Long childId);

    @Query("SELECT lr.subject, AVG(lr.score), COUNT(lr) FROM LearningRecord lr WHERE lr.child.id = :childId GROUP BY lr.subject")
    List<Object[]> getSubjectSummary(@Param("childId") Long childId);

    @Query("SELECT lr FROM LearningRecord lr WHERE lr.child.id = :childId AND lr.score >= :minScore AND lr.status = 'completed'")
    List<LearningRecord> findHighScoresByChildId(@Param("childId") Long childId, @Param("minScore") Integer minScore);
}
