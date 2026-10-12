package com.example.robot.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "content_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContentItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String subject;

    @Column(name = "content_type", nullable = false)
    private String contentType;

    @Column(name = "age_range")
    private String ageRange;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "difficulty_level")
    private Integer difficultyLevel;

    @Column(name = "is_published")
    private Boolean isPublished;

    @ElementCollection
    @CollectionTable(name = "content_tags", joinColumns = @JoinColumn(name = "content_id"))
    @Column(name = "tag", length = 64)
    private List<String> tags;

    @Column(length = 16)
    private String language;

    @Column(length = 32)
    private String difficulty;

    @Column
    private Integer duration;

    @Column(length = 128)
    private String author;

    @Column(length = 256)
    private String source;

    @Column(length = 32)
    private String status;

    @Column(columnDefinition = "TEXT")
    private String metadata;

    @Column(length = 16)
    private String version;

    @Column
    private Double rating;

    @Column(name = "view_count")
    private Long viewCount;

    @Column(length = 64)
    private String ageRangeMin;

    @Column(length = 64)
    private String ageRangeMax;

    @Column(columnDefinition = "TEXT")
    private String prerequisites;

    @Column(columnDefinition = "TEXT")
    private String learningObjectives;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (isPublished == null) isPublished = false;
        if (status == null) status = "draft";
        if (viewCount == null) viewCount = 0L;
        if (tags == null) tags = new ArrayList<>();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
