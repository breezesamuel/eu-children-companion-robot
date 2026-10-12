package com.example.robot.repository;

import com.example.robot.entity.HealthRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface HealthRecordRepository extends JpaRepository<HealthRecord, Long> {

    List<HealthRecord> findByChildId(Long childId);

    List<HealthRecord> findByChildIdAndType(Long childId, String type);

    List<HealthRecord> findByChildIdAndCreatedAtBetween(Long childId, LocalDateTime start, LocalDateTime end);

    List<HealthRecord> findByChildIdAndRecordDate(Long childId, String recordDate);

    List<HealthRecord> findByChildIdOrderByCreatedAtDesc(Long childId);

    @Query("SELECT h FROM HealthRecord h WHERE h.child.id = :childId AND h.type = :type ORDER BY h.createdAt DESC")
    List<HealthRecord> findByChildIdAndTypeOrderByDateDesc(@Param("childId") Long childId, @Param("type") String type);

    List<HealthRecord> findByDoctorName(String doctorName);

    @Query("SELECT h FROM HealthRecord h WHERE h.child.id = :childId ORDER BY h.createdAt DESC")
    List<HealthRecord> findRecentByChildId(@Param("childId") Long childId);

    @Query("SELECT AVG(h.bmi) FROM HealthRecord h WHERE h.child.id = :childId AND h.bmi IS NOT NULL")
    Optional<Double> calculateBmiAverage(@Param("childId") Long childId);

    @Query("SELECT COUNT(h) FROM HealthRecord h WHERE h.type = :type")
    long countByType(@Param("type") String type);

    @Query("SELECT h FROM HealthRecord h WHERE h.child.id = :childId AND h.recordDate BETWEEN :start AND :end")
    List<HealthRecord> findByChildIdAndDateBetween(@Param("childId") Long childId, @Param("start") String start, @Param("end") String end);

    @Query("SELECT h FROM HealthRecord h WHERE h.child.id = :childId AND h.followUpDate IS NOT NULL AND h.followUpDate <= CURRENT_DATE")
    List<HealthRecord> findPendingFollowUps(@Param("childId") Long childId);

    Optional<HealthRecord> findTopByChildIdOrderByCreatedAtDesc(Long childId);
}
