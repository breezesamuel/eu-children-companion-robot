package com.example.robot.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "children")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Child {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 128)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private User parent;

    @Column(name = "avatar_url", length = 512)
    private String avatarUrl;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(length = 16)
    private String gender;

    @Column(length = 32)
    private String language;

    @Column(columnDefinition = "TEXT")
    private String interests;

    @Column(columnDefinition = "TEXT")
    private String allergies;

    @Column(name = "learning_style", length = 64)
    private String learningStyle;

    @Column(name = "development_stage", length = 64)
    private String developmentStage;

    @Column(length = 32)
    private String grade;

    @Column(length = 512)
    private String emergencyContact;

    @Column(columnDefinition = "TEXT")
    private String medicalNotes;

    @OneToMany(mappedBy = "child", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<LearningRecord> learningRecords;

    @ElementCollection
    @CollectionTable(name = "child_milestones", joinColumns = @JoinColumn(name = "child_id"))
    @Column(name = "milestone", length = 256)
    private List<String> milestones;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public int getAgeYears() {
        if (dateOfBirth == null) return 0;
        return Period.between(dateOfBirth, LocalDate.now()).getYears();
    }

    public int getAgeMonths() {
        if (dateOfBirth == null) return 0;
        Period p = Period.between(dateOfBirth, LocalDate.now());
        return p.getYears() * 12 + p.getMonths();
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (isActive == null) isActive = true;
        if (language == null) language = "en";
        if (learningRecords == null) learningRecords = new ArrayList<>();
        if (milestones == null) milestones = new ArrayList<>();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
