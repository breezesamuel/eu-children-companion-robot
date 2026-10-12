package com.example.robot.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "entertainment_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EntertainmentItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String category;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "media_url")
    private String mediaUrl;

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    private Integer duration;

    @Column(name = "age_range")
    private String ageRange;

    @Column(length = 32)
    private String ageRating;

    @Column(columnDefinition = "TEXT")
    private String tags;

    @Column(length = 16)
    private String language;

    @Column(columnDefinition = "TEXT")
    private String subtitles;

    @Column(columnDefinition = "TEXT")
    private String metadata;

    @Column
    private Integer popularity;

    @Column(name = "release_date")
    private LocalDateTime releaseDate;

    @Column
    private Double rating;

    @Column(name = "view_count")
    private Long viewCount;

    @Column(name = "parent_category", length = 64)
    private String parentCategory;

    @Column(name = "sub_category", length = 64)
    private String subCategory;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @ElementCollection
    @CollectionTable(name = "entertainment_tags", joinColumns = @JoinColumn(name = "item_id"))
    @Column(name = "tag", length = 64)
    private List<String> tagList;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (viewCount == null) viewCount = 0L;
        if (popularity == null) popularity = 0;
        if (tagList == null) tagList = new ArrayList<>();
    }
}
