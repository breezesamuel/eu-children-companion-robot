package com.example.robot.controller;

import com.example.robot.entity.ContentItem;
import com.example.robot.service.ContentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/content")
@RequiredArgsConstructor
public class ContentController {

    private final ContentService contentService;

    @GetMapping
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(Map.of("success", true, "data", contentService.getAllContent()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return contentService.getContentById(id)
                .map(c -> ResponseEntity.ok(Map.of("success", true, "data", c)))
                .orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Content not found")));
    }

    @GetMapping("/{id}/detail")
    public ResponseEntity<?> getDetail(@PathVariable Long id) {
        return contentService.getContentById(id)
                .map(c -> ResponseEntity.ok(Map.of("success", true, "data", c)))
                .orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Content not found")));
    }

    @GetMapping("/subject/{subject}")
    public ResponseEntity<?> getBySubject(@PathVariable String subject) {
        return ResponseEntity.ok(Map.of("success", true, "data", contentService.getContentBySubject(subject)));
    }

    @GetMapping("/categories")
    public ResponseEntity<?> getCategories() {
        return ResponseEntity.ok(Map.of("success", true, "data", contentService.getCategories()));
    }

    @GetMapping("/categories/hierarchy")
    public ResponseEntity<?> getCategoryHierarchy() {
        return ResponseEntity.ok(Map.of("success", true, "data", contentService.getCategories()));
    }

    @GetMapping("/trending")
    public ResponseEntity<?> getTrending() {
        return ResponseEntity.ok(Map.of("success", true, "data", contentService.getTrending()));
    }

    @GetMapping("/recommended")
    public ResponseEntity<?> getRecommended(@RequestParam(defaultValue = "Math") String subject,
                                              @RequestParam(defaultValue = "5") Integer difficulty) {
        return ResponseEntity.ok(Map.of("success", true, "data", contentService.getRecommended(subject, difficulty)));
    }

    @GetMapping("/related/{id}")
    public ResponseEntity<?> getRelated(@PathVariable Long id) {
        return ResponseEntity.ok(Map.of("success", true, "data", contentService.getRelated(id)));
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        return ResponseEntity.ok(Map.of("success", true, "data", contentService.getContentStats()));
    }

    @GetMapping("/daily-pick")
    public ResponseEntity<?> getDailyPick() {
        List<ContentItem> trending = contentService.getTrending();
        if (trending.isEmpty()) {
            return ResponseEntity.ok(Map.of("success", true, "data", null));
        }
        return ResponseEntity.ok(Map.of("success", true, "data", trending.get(0)));
    }

    @PostMapping("/search")
    public ResponseEntity<?> search(@RequestBody Map<String, String> body) {
        String query = body.getOrDefault("query", "");
        return ResponseEntity.ok(Map.of("success", true, "data", contentService.searchContent(query)));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ContentItem item) {
        return ResponseEntity.ok(Map.of("success", true, "data", contentService.createContent(item)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody ContentItem item) {
        try {
            return ResponseEntity.ok(Map.of("success", true, "data", contentService.updateContent(id, item)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestParam String status) {
        ContentItem item = new ContentItem();
        item.setStatus(status);
        try {
            return ResponseEntity.ok(Map.of("success", true, "data", contentService.updateContent(id, item)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/rate")
    public ResponseEntity<?> rateContent(@PathVariable Long id, @RequestBody Map<String, Double> body) {
        return ResponseEntity.ok(Map.of("success", true, "data", contentService.rateContent(id, body.get("rating"))));
    }

    @PostMapping("/bulk/delete")
    public ResponseEntity<?> bulkDelete(@RequestBody Map<String, List<Long>> body) {
        contentService.bulkDelete(body.get("ids"));
        return ResponseEntity.ok(Map.of("success", true, "message", "Content deleted"));
    }

    @PostMapping("/import")
    public ResponseEntity<?> importContent(@RequestBody List<ContentItem> items) {
        List<ContentItem> created = items.stream().map(item -> {
            item.setCreatedAt(java.time.LocalDateTime.now());
            item.setUpdatedAt(java.time.LocalDateTime.now());
            return contentService.createContent(item);
        }).toList();
        return ResponseEntity.ok(Map.of("success", true, "data", created));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        contentService.deleteContent(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Content deleted"));
    }
}
