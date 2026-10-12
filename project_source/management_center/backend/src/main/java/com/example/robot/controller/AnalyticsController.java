package com.example.robot.controller;

import com.example.robot.service.ChildService;
import com.example.robot.service.DeviceService;
import com.example.robot.service.LearningService;
import com.example.robot.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final ChildService childService;
    private final DeviceService deviceService;
    private final LearningService learningService;
    private final UserService userService;

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard() {
        return ResponseEntity.ok(Map.of("success", true, "data", Map.of(
            "totalChildren", childService.getTotalChildren(),
            "totalDevices", deviceService.getAllDevices().size(),
            "onlineDevices", deviceService.getOnlineDevices().size(),
            "offlineDevices", deviceService.getOfflineDevices().size(),
            "totalUsers", userService.getAllUsers().size(),
            "totalLearningRecords", learningService.getStats().get("totalRecords"),
            "deviceStats", deviceService.getDeviceStats(),
            "userStats", userService.getUserStats()
        )));
    }

    @GetMapping("/dashboard/detailed")
    public ResponseEntity<?> getDetailedDashboard() {
        return ResponseEntity.ok(Map.of("success", true, "data", Map.of(
            "users", userService.getUserStats(),
            "devices", deviceService.getDeviceStats(),
            "learning", learningService.getStats(),
            "children", Map.of("total", childService.getTotalChildren())
        )));
    }

    @GetMapping("/learning-stats")
    public ResponseEntity<?> getLearningStats() {
        return ResponseEntity.ok(Map.of("success", true, "data", learningService.getStats()));
    }

    @GetMapping("/trends")
    public ResponseEntity<?> getTrends() {
        return ResponseEntity.ok(Map.of("success", true, "data", Map.of(
            "userGrowth", "Data pending",
            "deviceAdoption", "Data pending",
            "learningActivity", learningService.getStats()
        )));
    }

    @GetMapping("/retention")
    public ResponseEntity<?> getRetention() {
        return ResponseEntity.ok(Map.of("success", true, "data", Map.of(
            "dailyActiveUsers", userService.getAllUsers().size(),
            "weeklyRetention", "Data pending",
            "monthlyRetention", "Data pending"
        )));
    }

    @GetMapping("/funnels")
    public ResponseEntity<?> getFunnels() {
        return ResponseEntity.ok(Map.of("success", true, "data", Map.of(
            "registrationToFirstLesson", "Data pending",
            "firstLessonToCompleted", "Data pending"
        )));
    }

    @GetMapping("/cohorts")
    public ResponseEntity<?> getCohorts() {
        return ResponseEntity.ok(Map.of("success", true, "data", Map.of(
            "cohorts", "Data pending",
            "message", "Cohort analysis requires historical data"
        )));
    }

    @GetMapping("/export")
    public ResponseEntity<?> exportAnalytics() {
        return ResponseEntity.ok(Map.of("success", true, "data", Map.of(
            "users", userService.getUserStats(),
            "devices", deviceService.getDeviceStats(),
            "learning", learningService.getStats()
        )));
    }

    @GetMapping("/anomalies")
    public ResponseEntity<?> getAnomalies() {
        return ResponseEntity.ok(Map.of("success", true, "data", Map.of(
            "deviceAnomalies", deviceService.getDeviceStats().get("lowBattery"),
            "learningAnomalies", "No anomalies detected"
        )));
    }

    @GetMapping("/real-time")
    public ResponseEntity<?> getRealTime() {
        return ResponseEntity.ok(Map.of("success", true, "data", Map.of(
            "activeDevices", deviceService.getOnlineDevices().size(),
            "activeUsers", userService.getActiveUsers().size(),
            "recentLearning", learningService.getStats().get("totalRecords")
        )));
    }

    @GetMapping("/user-growth")
    public ResponseEntity<?> getUserGrowth() {
        return ResponseEntity.ok(Map.of("success", true, "data", userService.getUserStats()));
    }

    @GetMapping("/device-analytics")
    public ResponseEntity<?> getDeviceAnalytics() {
        return ResponseEntity.ok(Map.of("success", true, "data", deviceService.getDeviceStats()));
    }

    @GetMapping("/content-performance")
    public ResponseEntity<?> getContentPerformance() {
        return ResponseEntity.ok(Map.of("success", true, "data", learningService.getStats()));
    }
}
