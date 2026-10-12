package com.example.robot.controller;

import com.example.robot.entity.LearningRecord;
import com.example.robot.service.LearningService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/learning")
@RequiredArgsConstructor
public class LearningController {

    private final LearningService learningService;

    @GetMapping("/records")
    public ResponseEntity<?> getAllRecords() {
        return ResponseEntity.ok(Map.of("success", true, "data", learningService.getAllRecords()));
    }

    @GetMapping("/records/child/{childId}")
    public ResponseEntity<?> getByChild(@PathVariable Long childId) {
        return ResponseEntity.ok(Map.of("success", true, "data", learningService.getRecordsByChild(childId)));
    }

    @GetMapping("/records/subject/{subject}")
    public ResponseEntity<?> getBySubject(@PathVariable String subject) {
        return ResponseEntity.ok(Map.of("success", true, "data", learningService.getRecordsBySubject(subject)));
    }

    @GetMapping("/records/recent/{childId}")
    public ResponseEntity<?> getRecent(@PathVariable Long childId, @RequestParam(defaultValue = "5") int limit) {
        return ResponseEntity.ok(Map.of("success", true, "data", learningService.getRecentByChild(childId, limit)));
    }

    @PostMapping("/records")
    public ResponseEntity<?> createRecord(@RequestBody LearningRecord record) {
        return ResponseEntity.ok(Map.of("success", true, "data", learningService.createRecord(record)));
    }

    @PutMapping("/records/{id}")
    public ResponseEntity<?> updateRecord(@PathVariable Long id, @RequestBody LearningRecord record) {
        try {
            return ResponseEntity.ok(Map.of("success", true, "data", learningService.updateRecord(id, record)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        return ResponseEntity.ok(Map.of("success", true, "data", learningService.getStats()));
    }

    @GetMapping("/{childId}/streak")
    public ResponseEntity<?> getStreak(@PathVariable Long childId) {
        return ResponseEntity.ok(Map.of("success", true, "data", learningService.getStreak(childId)));
    }

    @GetMapping("/{childId}/mastery")
    public ResponseEntity<?> getMastery(@PathVariable Long childId) {
        return ResponseEntity.ok(Map.of("success", true, "data", learningService.getMastery(childId)));
    }

    @PostMapping("/{childId}/study-plan")
    public ResponseEntity<?> generateStudyPlan(@PathVariable Long childId) {
        return ResponseEntity.ok(Map.of("success", true, "data", learningService.generateStudyPlan(childId)));
    }

    @GetMapping("/recommendations/{childId}")
    public ResponseEntity<?> getRecommendations(@PathVariable Long childId) {
        return ResponseEntity.ok(Map.of("success", true, "data", learningService.getRecommendations(childId)));
    }

    @GetMapping("/{childId}/report")
    public ResponseEntity<?> getProgressReport(@PathVariable Long childId) {
        return ResponseEntity.ok(Map.of("success", true, "data", learningService.getProgressReport(childId)));
    }

    @GetMapping("/{childId}/summary/{subject}")
    public ResponseEntity<?> getSubjectSummary(@PathVariable Long childId, @PathVariable String subject) {
        return ResponseEntity.ok(Map.of("success", true, "data", learningService.getSubjectSummary(childId, subject)));
    }

    @GetMapping("/{childId}/goals")
    public ResponseEntity<?> getGoals(@PathVariable Long childId) {
        return ResponseEntity.ok(Map.of("success", true, "data", learningService.getGoals(childId)));
    }

    @PostMapping("/{childId}/goals")
    public ResponseEntity<?> createGoal(@PathVariable Long childId, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(Map.of("success", true, "data", learningService.createGoal(
            childId,
            (String) body.get("title"),
            (String) body.get("subject"),
            (Integer) body.get("targetScore")
        )));
    }

    @PutMapping("/{childId}/goals/{goalId}")
    public ResponseEntity<?> updateGoal(@PathVariable Long childId, @PathVariable String goalId, @RequestBody Map<String, Object> updates) {
        try {
            return ResponseEntity.ok(Map.of("success", true, "data", learningService.updateGoal(childId, goalId, updates)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/flashcards/{childId}")
    public ResponseEntity<?> getFlashcards(@PathVariable Long childId) {
        return ResponseEntity.ok(Map.of("success", true, "data", learningService.getFlashcards(childId)));
    }

    @PostMapping("/flashcards")
    public ResponseEntity<?> createFlashcard(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(Map.of("success", true, "data", learningService.createFlashcard(
            body.get("subject"), body.get("question"), body.get("answer")
        )));
    }

    @PostMapping("/quiz-results")
    public ResponseEntity<?> getQuizResults(@RequestBody Map<String, Long> body) {
        return ResponseEntity.ok(Map.of("success", true, "data", learningService.getQuizResults(body.get("childId"))));
    }

    @GetMapping("/{childId}/comparison")
    public ResponseEntity<?> getComparison(@PathVariable Long childId, @RequestParam(required = false) String subject) {
        return ResponseEntity.ok(Map.of("success", true, "data", learningService.getComparison(childId, subject)));
    }
}
