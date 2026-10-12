package com.example.robot.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "health_records")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HealthRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "child_id", nullable = false)
    private Child child;

    @Column(length = 32)
    private String type;

    @Column(length = 64)
    private String mood;

    @Column(name = "mood_intensity")
    private Integer moodIntensity;

    @Column(name = "sleep_hours")
    private Double sleepHours;

    @Column(name = "sleep_quality")
    private Integer sleepQuality;

    @Column(name = "energy_level")
    private Integer energyLevel;

    @Column
    private Double height;

    @Column
    private Double weight;

    @Column(name = "head_circumference")
    private Double headCircumference;

    @Column
    private Double bmi;

    @Column(name = "vision_test")
    private String visionTest;

    @Column(name = "hearing_test")
    private String hearingTest;

    @Column(name = "blood_pressure", length = 32)
    private String bloodPressure;

    @Column(name = "heart_rate")
    private Integer heartRate;

    @Column(name = "body_temperature")
    private Double bodyTemperature;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(columnDefinition = "TEXT")
    private String symptoms;

    @Column(length = 256)
    private String diagnosis;

    @Column(columnDefinition = "TEXT")
    private String medication;

    @Column(name = "doctor_name", length = 128)
    private String doctorName;

    @Column(length = 256)
    private String hospital;

    @Column(name = "follow_up_date")
    private LocalDate followUpDate;

    @Column(name = "record_date", length = 32)
    private String recordDate;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (height != null && weight != null) {
            double heightM = height / 100.0;
            bmi = Math.round(weight / (heightM * heightM) * 10.0) / 10.0;
        }
    }
}
