package com.example.robot.controller;

import com.example.robot.entity.HealthRecord;
import com.example.robot.service.HealthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
public class HealthController {

    private final HealthService healthService;

    @GetMapping("/records/{childId}")
    public ResponseEntity<?> getRecords(@PathVariable Long childId) {
        return ResponseEntity.ok(Map.of("success", true, "data", healthService.getRecordsByChild(childId)));
    }

    @GetMapping("/mood/{childId}")
    public ResponseEntity<?> getMood(@PathVariable Long childId) {
        return ResponseEntity.ok(Map.of("success", true, "data", healthService.getMoodByChild(childId)));
    }

    @GetMapping("/sleep/{childId}")
    public ResponseEntity<?> getSleep(@PathVariable Long childId) {
        return ResponseEntity.ok(Map.of("success", true, "data", healthService.getSleepByChild(childId)));
    }

    @GetMapping("/report/{childId}")
    public ResponseEntity<?> getReport(@PathVariable Long childId) {
        return ResponseEntity.ok(Map.of("success", true, "data", healthService.generateHealthReport(childId)));
    }

    @GetMapping("/{childId}/latest")
    public ResponseEntity<?> getLatestRecord(@PathVariable Long childId) {
        return healthService.getLatestRecord(childId)
                .map(r -> ResponseEntity.ok(Map.of("success", true, "data", r)))
                .orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "No records found")));
    }

    @GetMapping("/{childId}/growth")
    public ResponseEntity<?> getGrowthData(@PathVariable Long childId) {
        return ResponseEntity.ok(Map.of("success", true, "data", healthService.getGrowthPercentile(childId)));
    }

    @PostMapping("/{childId}/growth")
    public ResponseEntity<?> recordGrowth(@PathVariable Long childId, @RequestBody HealthRecord record) {
        return ResponseEntity.ok(Map.of("success", true, "data", healthService.createRecord(record)));
    }

    @GetMapping("/{childId}/bmi")
    public ResponseEntity<?> getBmi(@PathVariable Long childId) {
        return ResponseEntity.ok(Map.of("success", true, "data", healthService.calculateBMI(childId)));
    }

    @GetMapping("/{childId}/percentile")
    public ResponseEntity<?> getPercentile(@PathVariable Long childId) {
        return ResponseEntity.ok(Map.of("success", true, "data", healthService.getGrowthPercentile(childId)));
    }

    @GetMapping("/{childId}/score")
    public ResponseEntity<?> getHealthScore(@PathVariable Long childId) {
        return ResponseEntity.ok(Map.of("success", true, "data", healthService.getHealthScore(childId)));
    }

    @GetMapping("/{childId}/vaccinations")
    public ResponseEntity<?> getVaccinations(@PathVariable Long childId) {
        return ResponseEntity.ok(Map.of("success", true, "data", healthService.getVaccinationSchedule(childId)));
    }

    @PostMapping("/{childId}/vaccinations")
    public ResponseEntity<?> recordVaccination(@PathVariable Long childId, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(Map.of("success", true, "message", "Vaccination recorded"));
    }

    @GetMapping("/{childId}/alerts")
    public ResponseEntity<?> getHealthAlerts(@PathVariable Long childId) {
        return ResponseEntity.ok(Map.of("success", true, "data", healthService.getHealthAlerts(childId)));
    }

    @GetMapping("/export/{childId}")
    public ResponseEntity<?> exportHealthData(@PathVariable Long childId) {
        String csv = healthService.exportHealthData(childId);
        return ResponseEntity.ok()
                .header("Content-Type", "text/csv")
                .header("Content-Disposition", "attachment; filename=health_export_" + childId + ".csv")
                .body(csv);
    }

    @PostMapping("/records")
    public ResponseEntity<?> createRecord(@RequestBody HealthRecord record) {
        return ResponseEntity.ok(Map.of("success", true, "data", healthService.createRecord(record)));
    }

    @PutMapping("/records/{id}")
    public ResponseEntity<?> updateRecord(@PathVariable Long id, @RequestBody HealthRecord record) {
        try {
            return ResponseEntity.ok(Map.of("success", true, "data", healthService.updateRecord(id, record)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @DeleteMapping("/records/{id}")
    public ResponseEntity<?> deleteRecord(@PathVariable Long id) {
        healthService.deleteRecord(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Record deleted"));
    }
}
