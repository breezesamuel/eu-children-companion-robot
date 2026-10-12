package com.example.robot.controller;

import com.example.robot.entity.Child;
import com.example.robot.service.ChildService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/children")
@RequiredArgsConstructor
public class ChildController {

    private final ChildService childService;

    @GetMapping
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(Map.of("success", true, "data", childService.getAllChildren()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return childService.getChildById(id)
                .map(c -> ResponseEntity.ok(Map.of("success", true, "data", c)))
                .orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Child not found")));
    }

    @GetMapping("/parent/{parentId}")
    public ResponseEntity<?> getByParent(@PathVariable Long parentId) {
        return ResponseEntity.ok(Map.of("success", true, "data", childService.getChildrenByParent(parentId)));
    }

    @GetMapping("/{id}/progress")
    public ResponseEntity<?> getChildProgress(@PathVariable Long id) {
        return ResponseEntity.ok(Map.of("success", true, "data", childService.getChildStats(id)));
    }

    @GetMapping("/{id}/stats")
    public ResponseEntity<?> getChildStats(@PathVariable Long id) {
        return ResponseEntity.ok(Map.of("success", true, "data", childService.getChildStats(id)));
    }

    @GetMapping("/{id}/assessment")
    public ResponseEntity<?> getDevelopmentAssessment(@PathVariable Long id) {
        return ResponseEntity.ok(Map.of("success", true, "data", childService.getDevelopmentAssessment(id)));
    }

    @GetMapping("/{id}/milestones")
    public ResponseEntity<?> getMilestones(@PathVariable Long id) {
        return ResponseEntity.ok(Map.of("success", true, "data", childService.getMilestones(id)));
    }

    @PutMapping("/{id}/interests")
    public ResponseEntity<?> updateInterests(@PathVariable Long id, @RequestBody Map<String, String> body) {
        childService.updateInterests(id, body.get("interests"));
        return ResponseEntity.ok(Map.of("success", true, "message", "Interests updated"));
    }

    @GetMapping("/{id}/daily-summary")
    public ResponseEntity<?> getDailySummary(@PathVariable Long id) {
        return ResponseEntity.ok(Map.of("success", true, "data", childService.getChildStats(id)));
    }

    @GetMapping("/{id}/recommendations")
    public ResponseEntity<?> getRecommendations(@PathVariable Long id) {
        return ResponseEntity.ok(Map.of("success", true, "data", childService.getChildStats(id)));
    }

    @PostMapping("/batch/status")
    public ResponseEntity<?> batchStatus(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(Map.of("success", true, "message", "Batch status check not implemented"));
    }

    @GetMapping("/search")
    public ResponseEntity<?> search(@RequestParam String q) {
        return ResponseEntity.ok(Map.of("success", true, "data", childService.searchChildren(q)));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Child child) {
        try {
            return ResponseEntity.ok(Map.of("success", true, "data", childService.createChild(child)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Child child) {
        try {
            return ResponseEntity.ok(Map.of("success", true, "data", childService.updateChild(id, child)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        childService.deleteChild(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Child deleted"));
    }
}
