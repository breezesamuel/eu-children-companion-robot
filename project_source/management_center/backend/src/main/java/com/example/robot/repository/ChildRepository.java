package com.example.robot.repository;

import com.example.robot.entity.Child;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ChildRepository extends JpaRepository<Child, Long> {

    List<Child> findByParentId(Long parentId);

    List<Child> findByIsActive(Boolean isActive);

    long countByIsActive(Boolean isActive);

    @Query("SELECT c FROM Child c WHERE c.dateOfBirth BETWEEN :start AND :end")
    List<Child> findByDateOfBirthBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT c FROM Child c WHERE FUNCTION('TIMESTAMPDIFF', YEAR, c.dateOfBirth, CURRENT_DATE) BETWEEN :minAge AND :maxAge")
    List<Child> findByAgeBetween(@Param("minAge") int minAge, @Param("maxAge") int maxAge);

    List<Child> findByGrade(String grade);

    @Query("SELECT c FROM Child c WHERE LOWER(c.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<Child> searchByName(@Param("name") String name);

    @Query("SELECT c FROM Child c WHERE LOWER(c.interests) LIKE LOWER(CONCAT('%', :interest, '%'))")
    List<Child> findByInterestsContains(@Param("interest") String interest);

    long countByParentId(Long parentId);

    @Query("SELECT c FROM Child c WHERE c.developmentStage = :stage")
    List<Child> findByDevelopmentStage(@Param("stage") String stage);

    @Query("SELECT c FROM Child c WHERE c.learningStyle = :style")
    List<Child> findByLearningStyle(@Param("style") String style);

    List<Child> findByLanguage(String language);
}
