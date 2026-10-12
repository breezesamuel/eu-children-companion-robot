package com.example.robot.controller;

import com.example.robot.entity.EntertainmentItem;
import com.example.robot.service.EntertainmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/entertainment")
@RequiredArgsConstructor
public class EntertainmentController {

    private final EntertainmentService entertainmentService;

    @GetMapping
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(Map.of("success", true, "data", entertainmentService.getAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return entertainmentService.getById(id)
                .map(e -> ResponseEntity.ok(Map.of("success", true, "data", e)))
                .orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Item not found")));
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<?> getByCategory(@PathVariable String category) {
        return ResponseEntity.ok(Map.of("success", true, "data", entertainmentService.getByCategory(category)));
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        return ResponseEntity.ok(Map.of("success", true, "data", entertainmentService.getCategoryStats()));
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchMedia(@RequestParam String q) {
        return ResponseEntity.ok(Map.of("success", true, "data", entertainmentService.searchMedia(q)));
    }

    @GetMapping("/trending")
    public ResponseEntity<?> getTrending() {
        return ResponseEntity.ok(Map.of("success", true, "data", entertainmentService.getTrending()));
    }

    @GetMapping("/recommended")
    public ResponseEntity<?> getRecommended(@RequestParam(required = false) String category) {
        return ResponseEntity.ok(Map.of("success", true, "data", entertainmentService.getRecommended(category)));
    }

    @PostMapping("/media")
    public ResponseEntity<?> createMedia(@RequestBody EntertainmentItem item) {
        return ResponseEntity.ok(Map.of("success", true, "data", entertainmentService.createMedia(item)));
    }

    @PutMapping("/media/{id}")
    public ResponseEntity<?> updateMedia(@PathVariable Long id, @RequestBody EntertainmentItem item) {
        try {
            return ResponseEntity.ok(Map.of("success", true, "data", entertainmentService.updateMedia(id, item)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @DeleteMapping("/media/{id}")
    public ResponseEntity<?> deleteMedia(@PathVariable Long id) {
        try {
            entertainmentService.deleteMedia(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Media deleted"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/media/{id}/rate")
    public ResponseEntity<?> rateMedia(@PathVariable Long id, @RequestBody Map<String, Double> body) {
        return ResponseEntity.ok(Map.of("success", true, "data", entertainmentService.rateMedia(id, body.get("rating"))));
    }

    @PostMapping("/media/{id}/play")
    public ResponseEntity<?> recordPlay(@PathVariable Long id) {
        return ResponseEntity.ok(Map.of("success", true, "data", entertainmentService.recordPlay(id)));
    }

    @GetMapping("/playlists")
    public ResponseEntity<?> getPlaylists() {
        return ResponseEntity.ok(Map.of("success", true, "data", entertainmentService.getPlaylists()));
    }

    @GetMapping("/playlists/{name}")
    public ResponseEntity<?> getPlaylistDetail(@PathVariable String name) {
        return ResponseEntity.ok(Map.of("success", true, "data", entertainmentService.getPlaylistDetail(name)));
    }

    @PostMapping("/playlists")
    public ResponseEntity<?> createPlaylist(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(Map.of("success", true, "data", entertainmentService.createPlaylist(body.get("name"))));
    }

    @PutMapping("/playlists/{name}")
    public ResponseEntity<?> updatePlaylist(@PathVariable String name, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(Map.of("success", true, "message", "Playlist updated"));
    }

    @PostMapping("/playlists/{name}/items")
    public ResponseEntity<?> addToPlaylist(@PathVariable String name, @RequestBody Map<String, Long> body) {
        entertainmentService.addToPlaylist(name, body.get("itemId"));
        return ResponseEntity.ok(Map.of("success", true, "message", "Item added to playlist"));
    }

    @DeleteMapping("/playlists/{name}/items")
    public ResponseEntity<?> removeFromPlaylist(@PathVariable String name, @RequestParam Long itemId) {
        entertainmentService.removeFromPlaylist(name, itemId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Item removed from playlist"));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody EntertainmentItem item) {
        return ResponseEntity.ok(Map.of("success", true, "data", entertainmentService.create(item)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        entertainmentService.delete(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Item deleted"));
    }
}
