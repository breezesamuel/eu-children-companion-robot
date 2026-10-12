package com.example.robot.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "learning_records")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearningRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "child_id")
    private Child child;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "content_id")
    private ContentItem content;

    @Column(length = 32)
    private String status;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column
    private Integer duration;

    @Column
    private Integer score;

    @Column(name = "max_score")
    private Integer maxScore;

    @Column(columnDefinition = "TEXT")
    private String answers;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column
    private Integer engagement;

    @Column(name = "difficulty_rating")
    private Integer difficultyRating;

    @Column(length = 64)
    private String subject;

    @Column(length = 64)
    private String topic;

    @Column(columnDefinition = "TEXT")
    private String skills;

    @Column
    private Double progress;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) status = "in_progress";
        if (skills == null) skills = "[]";
    }
}
