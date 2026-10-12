package com.example.robot.service;

import com.example.robot.entity.LearningRecord;
import com.example.robot.repository.LearningRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LearningService {

    private final LearningRecordRepository learningRecordRepository;

    private final Map<String, List<Map<String, Object>>> flashcards = new HashMap<>();
    private final Map<Long, List<Map<String, Object>>> goals = new HashMap<>();

    @Transactional(readOnly = true)
    public List<LearningRecord> getAllRecords() {
        return learningRecordRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<LearningRecord> getRecordsByChild(Long childId) {
        return learningRecordRepository.findByChildId(childId);
    }

    @Transactional(readOnly = true)
    public List<LearningRecord> getRecordsBySubject(String subject) {
        return learningRecordRepository.findBySubject(subject);
    }

    @Transactional
    public LearningRecord createRecord(LearningRecord record) {
        log.info("Creating learning record: child={}, subject={}", record.getChild() != null ? record.getChild().getId() : null, record.getSubject());
        if ("completed".equals(record.getStatus()) && record.getCompletedAt() == null) {
            record.setCompletedAt(LocalDateTime.now());
        }
        if (record.getStartedAt() == null) {
            record.setStartedAt(LocalDateTime.now());
        }
        if (record.getMaxScore() != null && record.getScore() != null) {
            record.setProgress(Math.round((double) record.getScore() / record.getMaxScore() * 100.0 * 10.0) / 10.0);
        }
        return learningRecordRepository.save(record);
    }

    @Transactional
    public LearningRecord updateRecord(Long id, LearningRecord details) {
        LearningRecord record = learningRecordRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Learning record not found"));
        if (details.getStatus() != null) record.setStatus(details.getStatus());
        if (details.getScore() != null) record.setScore(details.getScore());
        if (details.getMaxScore() != null) record.setMaxScore(details.getMaxScore());
        if (details.getDuration() != null) record.setDuration(details.getDuration());
        if (details.getFeedback() != null) record.setFeedback(details.getFeedback());
        if (details.getEngagement() != null) record.setEngagement(details.getEngagement());
        if (details.getDifficultyRating() != null) record.setDifficultyRating(details.getDifficultyRating());
        if (details.getAnswers() != null) record.setAnswers(details.getAnswers());
        if (details.getProgress() != null) record.setProgress(details.getProgress());
        if (details.getTopic() != null) record.setTopic(details.getTopic());
        if (details.getSkills() != null) record.setSkills(details.getSkills());
        if ("completed".equals(details.getStatus()) && record.getCompletedAt() == null) {
            record.setCompletedAt(LocalDateTime.now());
        }
        if (record.getMaxScore() != null && record.getScore() != null) {
            record.setProgress(Math.round((double) record.getScore() / record.getMaxScore() * 100.0 * 10.0) / 10.0);
        }
        return learningRecordRepository.save(record);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getStats() {
        List<LearningRecord> all = learningRecordRepository.findAll();
        var bySubject = all.stream().collect(Collectors.groupingBy(LearningRecord::getSubject, Collectors.counting()));
        double avgScore = all.stream().filter(r -> r.getScore() != null).mapToInt(LearningRecord::getScore).average().orElse(0);
        return Map.of(
            "totalRecords", all.size(),
            "bySubject", bySubject,
            "averageScore", Math.round(avgScore * 10.0) / 10.0,
            "uniqueChildren", all.stream().filter(r -> r.getChild() != null).map(r -> r.getChild().getId()).distinct().count()
        );
    }

    @Transactional(readOnly = true)
    public List<LearningRecord> getRecentByChild(Long childId, int limit) {
        return learningRecordRepository.findTop10ByChildIdOrderByCreatedAtDesc(childId)
                .stream().limit(limit).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getStreak(Long childId) {
        List<LearningRecord> records = learningRecordRepository.findByChildIdOrderByCompletedAtDesc(childId);
        if (records.isEmpty()) return Map.of("currentStreak", 0, "longestStreak", 0);

        int currentStreak = 0;
        int longestStreak = 0;
        LocalDate today = LocalDate.now();
        Set<LocalDate> activeDays = records.stream()
                .filter(r -> r.getCompletedAt() != null)
                .map(r -> r.getCompletedAt().toLocalDate())
                .collect(Collectors.toSet());

        LocalDate check = today;
        while (activeDays.contains(check)) {
            currentStreak++;
            check = check.minusDays(1);
        }
        List<LocalDate> sorted = activeDays.stream().sorted().toList();
        int tempStreak = 1;
        for (int i = 1; i < sorted.size(); i++) {
            if (sorted.get(i).minusDays(1).equals(sorted.get(i - 1))) {
                tempStreak++;
                longestStreak = Math.max(longestStreak, tempStreak);
            } else {
                tempStreak = 1;
            }
        }
        longestStreak = Math.max(longestStreak, currentStreak);
        return Map.of("currentStreak", currentStreak, "longestStreak", longestStreak, "totalActiveDays", activeDays.size());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMastery(Long childId) {
        List<LearningRecord> records = learningRecordRepository.findByChildId(childId);
        var bySubject = records.stream()
                .filter(r -> r.getScore() != null && r.getMaxScore() != null)
                .collect(Collectors.groupingBy(LearningRecord::getSubject));
        Map<String, Object> mastery = new HashMap<>();
        bySubject.forEach((subject, recs) -> {
            double avgPct = recs.stream()
                    .mapToDouble(r -> (double) r.getScore() / r.getMaxScore() * 100)
                    .average().orElse(0);
            String level;
            if (avgPct >= 90) level = "mastered";
            else if (avgPct >= 70) level = "proficient";
            else if (avgPct >= 50) level = "developing";
            else level = "beginner";
            mastery.put(subject, Map.of("averageScore", Math.round(avgPct * 10.0) / 10.0, "level", level, "attempts", recs.size()));
        });
        return Map.of("childId", childId, "mastery", mastery);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> generateStudyPlan(Long childId) {
        List<LearningRecord> records = learningRecordRepository.findByChildId(childId);
        var bySubject = records.stream().collect(Collectors.groupingBy(LearningRecord::getSubject));
        List<Map<String, Object>> plan = new ArrayList<>();
        bySubject.forEach((subject, recs) -> {
            double avgScore = recs.stream().filter(r -> r.getScore() != null).mapToInt(LearningRecord::getScore).average().orElse(0);
            String recommendation;
            if (avgScore < 50) recommendation = "Review fundamentals";
            else if (avgScore < 70) recommendation = "Practice more exercises";
            else if (avgScore < 90) recommendation = "Move to advanced topics";
            else recommendation = "Consider enrichment";
            plan.add(Map.of("subject", subject, "avgScore", Math.round(avgScore * 10.0) / 10.0, "recommendation", recommendation, "totalSessions", recs.size()));
        });
        return plan;
    }

    @Transactional(readOnly = true)
    public List<LearningRecord> getRecommendations(Long childId) {
        List<LearningRecord> records = learningRecordRepository.findByChildId(childId);
        Set<String> weakSubjects = records.stream()
                .filter(r -> r.getScore() != null && r.getScore() < 50)
                .map(LearningRecord::getSubject)
                .collect(Collectors.toSet());
        if (weakSubjects.isEmpty()) {
            return records.stream().sorted(Comparator.comparing(LearningRecord::getCreatedAt).reversed()).limit(5).toList();
        }
        return records.stream()
                .filter(r -> weakSubjects.contains(r.getSubject()))
                .sorted(Comparator.comparing(LearningRecord::getCreatedAt).reversed())
                .limit(10).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getProgressReport(Long childId) {
        List<LearningRecord> records = learningRecordRepository.findByChildId(childId);
        long total = records.size();
        long completed = records.stream().filter(r -> "completed".equals(r.getStatus())).count();
        long inProgress = records.stream().filter(r -> "in_progress".equals(r.getStatus())).count();
        double avgScore = records.stream().filter(r -> r.getScore() != null).mapToInt(LearningRecord::getScore).average().orElse(0);
        long totalMinutes = records.stream().filter(r -> r.getDuration() != null).mapToLong(LearningRecord::getDuration).sum();
        Map<String, Object> streak = getStreak(childId);
        Map<String, Object> mastery = getMastery(childId);

        return Map.of(
            "childId", childId,
            "totalSessions", total,
            "completedSessions", completed,
            "inProgressSessions", inProgress,
            "averageScore", Math.round(avgScore * 10.0) / 10.0,
            "totalMinutes", totalMinutes,
            "streak", streak,
            "mastery", mastery
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getSubjectSummary(Long childId, String subject) {
        List<LearningRecord> records = learningRecordRepository.findByChildIdAndSubject(childId, subject);
        if (records.isEmpty()) return Map.of("subject", subject, "message", "No records found");
        double avgScore = records.stream().filter(r -> r.getScore() != null).mapToInt(LearningRecord::getScore).average().orElse(0);
        long sessions = records.size();
        long totalDuration = records.stream().filter(r -> r.getDuration() != null).mapToLong(LearningRecord::getDuration).sum();
        List<Map<String, Object>> scoreHistory = records.stream()
                .filter(r -> r.getScore() != null)
                .map(r -> Map.<String, Object>of("date", r.getCreatedAt().toLocalDate().toString(), "score", r.getScore()))
                .toList();
        return Map.of(
            "subject", subject,
            "totalSessions", sessions,
            "averageScore", Math.round(avgScore * 10.0) / 10.0,
            "totalMinutes", totalDuration,
            "scoreHistory", scoreHistory
        );
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getGoals(Long childId) {
        return goals.getOrDefault(childId, List.of());
    }

    @Transactional
    public Map<String, Object> createGoal(Long childId, String title, String subject, Integer targetScore) {
        Map<String, Object> goal = new HashMap<>();
        goal.put("id", UUID.randomUUID().toString());
        goal.put("title", title);
        goal.put("subject", subject);
        goal.put("targetScore", targetScore);
        goal.put("progress", 0);
        goal.put("createdAt", LocalDateTime.now().toString());
        goal.put("status", "active");
        goals.computeIfAbsent(childId, k -> new ArrayList<>()).add(goal);
        return goal;
    }

    @Transactional
    public Map<String, Object> updateGoal(Long childId, String goalId, Map<String, Object> updates) {
        List<Map<String, Object>> childGoals = goals.get(childId);
        if (childGoals == null) throw new IllegalArgumentException("Goal not found");
        return childGoals.stream()
                .filter(g -> goalId.equals(g.get("id")))
                .findFirst()
                .map(goal -> {
                    if (updates.containsKey("progress")) goal.put("progress", updates.get("progress"));
                    if (updates.containsKey("status")) goal.put("status", updates.get("status"));
                    if (updates.containsKey("title")) goal.put("title", updates.get("title"));
                    return goal;
                })
                .orElseThrow(() -> new IllegalArgumentException("Goal not found"));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getFlashcards(Long childId) {
        return flashcards.getOrDefault(String.valueOf(childId), List.of());
    }

    @Transactional
    public Map<String, Object> createFlashcard(String subject, String question, String answer) {
        Map<String, Object> card = new HashMap<>();
        card.put("id", UUID.randomUUID().toString());
        card.put("subject", subject);
        card.put("question", question);
        card.put("answer", answer);
        card.put("createdAt", LocalDateTime.now().toString());
        flashcards.computeIfAbsent(subject, k -> new ArrayList<>()).add(card);
        return card;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getQuizResults(Long childId) {
        List<LearningRecord> records = learningRecordRepository.findByChildId(childId);
        var quizzes = records.stream()
                .filter(r -> r.getScore() != null && r.getMaxScore() != null)
                .map(r -> Map.<String, Object>of(
                    "subject", r.getSubject(),
                    "score", r.getScore(),
                    "maxScore", r.getMaxScore(),
                    "percentage", Math.round((double) r.getScore() / r.getMaxScore() * 100.0 * 10.0) / 10.0,
                    "date", r.getCompletedAt() != null ? r.getCompletedAt().toLocalDate().toString() : r.getCreatedAt().toLocalDate().toString()
                ))
                .toList();
        double avgPercentage = quizzes.stream()
                .filter(q -> q.get("percentage") instanceof Double)
                .mapToDouble(q -> (Double) q.get("percentage"))
                .average().orElse(0);
        return Map.of("totalQuizzes", quizzes.size(), "averagePercentage", Math.round(avgPercentage * 10.0) / 10.0, "quizzes", quizzes);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getComparison(Long childId, String subject) {
        List<LearningRecord> allRecords = learningRecordRepository.findAll();
        List<LearningRecord> childRecords = learningRecordRepository.findByChildId(childId);

        double childAvg = childRecords.stream().filter(r -> r.getScore() != null).mapToInt(LearningRecord::getScore).average().orElse(0);
        double overallAvg = allRecords.stream().filter(r -> r.getScore() != null).mapToInt(LearningRecord::getScore).average().orElse(0);

        double childSubjectAvg = childRecords.stream()
                .filter(r -> subject == null || subject.equals(r.getSubject()))
                .filter(r -> r.getScore() != null)
                .mapToInt(LearningRecord::getScore).average().orElse(0);
        double overallSubjectAvg = allRecords.stream()
                .filter(r -> subject == null || subject.equals(r.getSubject()))
                .filter(r -> r.getScore() != null)
                .mapToInt(LearningRecord::getScore).average().orElse(0);

        return Map.of(
            "childId", childId,
            "subject", subject != null ? subject : "all",
            "childAverageScore", Math.round(childAvg * 10.0) / 10.0,
            "overallAverageScore", Math.round(overallAvg * 10.0) / 10.0,
            "childSubjectAverage", Math.round(childSubjectAvg * 10.0) / 10.0,
            "overallSubjectAverage", Math.round(overallSubjectAvg * 10.0) / 10.0
        );
    }
}
