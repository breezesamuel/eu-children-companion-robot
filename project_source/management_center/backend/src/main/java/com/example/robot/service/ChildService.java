package com.example.robot.service;

import com.example.robot.entity.Child;
import com.example.robot.entity.LearningRecord;
import com.example.robot.repository.ChildRepository;
import com.example.robot.repository.LearningRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Period;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChildService {

    private final ChildRepository childRepository;
    private final LearningRecordRepository learningRecordRepository;

    @Transactional(readOnly = true)
    public List<Child> getAllChildren() {
        return childRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Child> getChildById(Long id) {
        return childRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public List<Child> getChildrenByParent(Long parentId) {
        return childRepository.findByParentId(parentId);
    }

    @Transactional
    public Child createChild(Child child) {
        if (child.getDateOfBirth() == null) {
            throw new IllegalArgumentException("Date of birth is required");
        }
        if (child.getName() == null || child.getName().isBlank()) {
            throw new IllegalArgumentException("Child name is required");
        }
        int ageYears = Period.between(child.getDateOfBirth(), LocalDate.now()).getYears();
        if (ageYears > 18) {
            throw new IllegalArgumentException("Child age cannot exceed 18 years");
        }
        log.info("Creating child: {}", child.getName());
        return childRepository.save(child);
    }

    @Transactional
    public Child updateChild(Long id, Child details) {
        Child child = childRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Child not found"));
        if (details.getName() != null) child.setName(details.getName());
        if (details.getDateOfBirth() != null) child.setDateOfBirth(details.getDateOfBirth());
        if (details.getGender() != null) child.setGender(details.getGender());
        if (details.getLanguage() != null) child.setLanguage(details.getLanguage());
        if (details.getInterests() != null) child.setInterests(details.getInterests());
        if (details.getGrade() != null) child.setGrade(details.getGrade());
        if (details.getIsActive() != null) child.setIsActive(details.getIsActive());
        if (details.getAvatarUrl() != null) child.setAvatarUrl(details.getAvatarUrl());
        if (details.getAllergies() != null) child.setAllergies(details.getAllergies());
        if (details.getLearningStyle() != null) child.setLearningStyle(details.getLearningStyle());
        if (details.getDevelopmentStage() != null) child.setDevelopmentStage(details.getDevelopmentStage());
        if (details.getMedicalNotes() != null) child.setMedicalNotes(details.getMedicalNotes());
        if (details.getEmergencyContact() != null) child.setEmergencyContact(details.getEmergencyContact());
        if (details.getMilestones() != null) child.setMilestones(details.getMilestones());
        log.info("Updating child: {}", child.getName());
        return childRepository.save(child);
    }

    @Transactional
    public void deleteChild(Long id) {
        Child child = childRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Child not found"));
        child.setIsActive(false);
        childRepository.save(child);
        log.info("Soft-deleted child: {}", id);
    }

    @Transactional(readOnly = true)
    public long getTotalChildren() {
        return childRepository.countByIsActive(true);
    }

    @Transactional(readOnly = true)
    public Child getChildWithProgress(Long childId) {
        return childRepository.findById(childId)
                .orElseThrow(() -> new IllegalArgumentException("Child not found"));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getChildStats(Long childId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new IllegalArgumentException("Child not found"));
        List<LearningRecord> records = learningRecordRepository.findByChildId(childId);
        long totalSessions = records.size();
        long completedSessions = records.stream().filter(r -> "completed".equals(r.getStatus())).count();
        double avgScore = records.stream().filter(r -> r.getScore() != null).mapToInt(LearningRecord::getScore).average().orElse(0);
        long totalDuration = records.stream().filter(r -> r.getDuration() != null).mapToLong(LearningRecord::getDuration).sum();
        var subjects = records.stream().collect(Collectors.groupingBy(LearningRecord::getSubject, Collectors.counting()));

        return Map.of(
            "childId", childId,
            "name", child.getName(),
            "ageYears", child.getAgeYears(),
            "ageMonths", child.getAgeMonths(),
            "totalSessions", totalSessions,
            "completedSessions", completedSessions,
            "avgScore", Math.round(avgScore * 10.0) / 10.0,
            "totalMinutes", totalDuration,
            "subjects", subjects,
            "grade", child.getGrade(),
            "developmentStage", child.getDevelopmentStage()
        );
    }

    @Transactional(readOnly = true)
    public String calculateAgeGroup(int ageYears) {
        if (ageYears <= 2) return "toddler";
        if (ageYears <= 5) return "preschool";
        if (ageYears <= 12) return "child";
        if (ageYears <= 18) return "teen";
        return "adult";
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getDevelopmentAssessment(Long childId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new IllegalArgumentException("Child not found"));
        int ageMonths = child.getAgeMonths();
        List<String> milestones = child.getMilestones();
        List<String> expectedMilestones = getExpectedMilestones(ageMonths);
        long achievedCount = expectedMilestones.stream().filter(m -> milestones != null && milestones.contains(m)).count();
        double progress = expectedMilestones.isEmpty() ? 0 : (double) achievedCount / expectedMilestones.size() * 100;

        return Map.of(
            "childId", childId,
            "ageMonths", ageMonths,
            "expectedMilestones", expectedMilestones,
            "achievedMilestones", milestones,
            "developmentProgress", Math.round(progress * 10.0) / 10.0,
            "learningStyle", child.getLearningStyle(),
            "developmentStage", child.getDevelopmentStage()
        );
    }

    private List<String> getExpectedMilestones(int ageMonths) {
        if (ageMonths <= 12) return List.of("sitting", "crawling", "babbling");
        if (ageMonths <= 24) return List.of("walking", "first_words", "stacking_blocks");
        if (ageMonths <= 36) return List.of("running", "sentences", "toilet_training");
        if (ageMonths <= 60) return List.of("reading_basics", "counting", "social_play");
        return List.of("reading", "writing", "critical_thinking", "teamwork");
    }

    @Transactional(readOnly = true)
    public List<String> getMilestones(Long childId) {
        return childRepository.findById(childId)
                .map(Child::getMilestones)
                .orElse(List.of());
    }

    @Transactional(readOnly = true)
    public String getInterests(Long childId) {
        return childRepository.findById(childId)
                .map(Child::getInterests)
                .orElse("");
    }

    @Transactional
    public void updateInterests(Long childId, String interests) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new IllegalArgumentException("Child not found"));
        child.setInterests(interests);
        childRepository.save(child);
    }

    @Transactional(readOnly = true)
    public List<Child> searchChildren(String query) {
        return childRepository.searchByName(query);
    }
}
