package com.example.robot.repository;

import com.example.robot.entity.EntertainmentItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EntertainmentItemRepository extends JpaRepository<EntertainmentItem, Long> {

    List<EntertainmentItem> findByCategory(String category);

    List<EntertainmentItem> findByAgeRange(String ageRange);

    List<EntertainmentItem> findByIsActiveTrue();

    List<EntertainmentItem> findByCategoryAndIsActiveTrue(String category);

    long countByCategory(String category);

    List<EntertainmentItem> findByAgeRating(String ageRating);

    List<EntertainmentItem> findByLanguage(String language);

    List<EntertainmentItem> findByParentCategory(String parentCategory);

    List<EntertainmentItem> findBySubCategory(String subCategory);

    @Query("SELECT e FROM EntertainmentItem e WHERE e.popularity > :threshold ORDER BY e.popularity DESC")
    List<EntertainmentItem> findByPopularityGreaterThan(@Param("threshold") Integer threshold);

    @Query("SELECT e FROM EntertainmentItem e WHERE LOWER(e.title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(e.description) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<EntertainmentItem> searchByTitleAndDescription(@Param("query") String query);

    @Query("SELECT e FROM EntertainmentItem e WHERE e.isActive = true ORDER BY e.popularity DESC")
    List<EntertainmentItem> findTrending();

    @Query("SELECT e FROM EntertainmentItem e WHERE e.isActive = true ORDER BY e.rating DESC")
    List<EntertainmentItem> findTopRated();

    @Query("SELECT e FROM EntertainmentItem e WHERE e.isActive = true AND e.category = :category ORDER BY e.popularity DESC")
    List<EntertainmentItem> findPopularByCategory(@Param("category") String category);

    @Query("SELECT DISTINCT e.parentCategory FROM EntertainmentItem e WHERE e.parentCategory IS NOT NULL")
    List<String> findDistinctParentCategories();

    @Query("SELECT DISTINCT e.subCategory FROM EntertainmentItem e WHERE e.parentCategory = :parent AND e.subCategory IS NOT NULL")
    List<String> findSubCategoriesByParent(@Param("parent") String parent);

    @Query("SELECT e FROM EntertainmentItem e WHERE e.isActive = true AND e.ageRange LIKE %:age%")
    List<EntertainmentItem> findByAgeRangeContaining(@Param("age") String age);
}
