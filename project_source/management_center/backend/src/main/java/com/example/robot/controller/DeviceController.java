package com.example.robot.controller;

import com.example.robot.entity.Device;
import com.example.robot.service.DeviceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/devices")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceService deviceService;

    @GetMapping
    public ResponseEntity<List<Device>> getAllDevices() {
        return ResponseEntity.ok(deviceService.getAllDevices());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Device> getDeviceById(@PathVariable Long id) {
        return deviceService.getDeviceById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/device-id/{deviceId}")
    public ResponseEntity<Device> getDeviceByDeviceId(@PathVariable String deviceId) {
        return deviceService.getDeviceByDeviceId(deviceId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<Device>> getDevicesByStatus(@PathVariable String status) {
        return ResponseEntity.ok(deviceService.getDevicesByStatus(status));
    }

    @GetMapping("/online")
    public ResponseEntity<List<Device>> getOnlineDevices() {
        return ResponseEntity.ok(deviceService.getOnlineDevices());
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getDeviceStats() {
        return ResponseEntity.ok(Map.of("success", true, "data", deviceService.getDeviceStats()));
    }

    @GetMapping("/alerts")
    public ResponseEntity<?> getAlerts() {
        return ResponseEntity.ok(Map.of("success", true, "data", Map.of(
            "batteryAlerts", deviceService.getBatteryAlerts(),
            "temperatureAlerts", deviceService.getTemperatureAlerts()
        )));
    }

    @GetMapping("/nearby")
    public ResponseEntity<?> getNearbyDevices(@RequestParam Double lat, @RequestParam Double lng, @RequestParam(defaultValue = "10") Double radius) {
        return ResponseEntity.ok(Map.of("success", true, "data", deviceService.getNearbyDevices(lat, lng, radius)));
    }

    @GetMapping("/export")
    public ResponseEntity<?> exportDevices() {
        return ResponseEntity.ok(Map.of("success", true, "data", deviceService.getAllDevices()));
    }

    @PostMapping
    public ResponseEntity<Device> createDevice(@RequestBody Device device) {
        return ResponseEntity.ok(deviceService.createDevice(device));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Device> updateDevice(@PathVariable Long id, @RequestBody Device device) {
        return ResponseEntity.ok(deviceService.updateDevice(id, device));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDevice(@PathVariable Long id) {
        deviceService.deleteDevice(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{deviceId}/status")
    public ResponseEntity<Device> updateDeviceStatus(@PathVariable String deviceId, @RequestParam String status) {
        return ResponseEntity.ok(deviceService.updateDeviceStatus(deviceId, status));
    }

    @PatchMapping("/{deviceId}/battery")
    public ResponseEntity<Device> updateBatteryLevel(@PathVariable String deviceId, @RequestParam Integer batteryLevel) {
        return ResponseEntity.ok(deviceService.updateBatteryLevel(deviceId, batteryLevel));
    }

    @PostMapping("/{id}/heartbeat")
    public ResponseEntity<?> recordHeartbeat(@PathVariable String id, @RequestBody Map<String, Object> telemetry) {
        return ResponseEntity.ok(Map.of("success", true, "data", deviceService.recordHeartbeat(id, telemetry)));
    }

    @PostMapping("/{id}/diagnostics")
    public ResponseEntity<?> runDiagnostics(@PathVariable String id) {
        return ResponseEntity.ok(Map.of("success", true, "data", deviceService.runDiagnostics(id)));
    }

    @PatchMapping("/{id}/firmware")
    public ResponseEntity<?> updateFirmware(@PathVariable String id, @RequestParam String version) {
        return ResponseEntity.ok(Map.of("success", true, "data", deviceService.updateFirmware(id, version)));
    }

    @GetMapping("/telemetry/{id}")
    public ResponseEntity<?> getTelemetry(@PathVariable Long id) {
        return deviceService.getDeviceById(id)
                .map(d -> ResponseEntity.ok(Map.of("success", true, "data", d)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/logs")
    public ResponseEntity<?> getDeviceLogs(@PathVariable String id) {
        return ResponseEntity.ok(Map.of("success", true, "message", "Logs endpoint", "deviceId", id));
    }

    @PostMapping("/{id}/pair")
    public ResponseEntity<?> pairDevice(@PathVariable String id, @RequestParam Long childId) {
        return ResponseEntity.ok(Map.of("success", true, "data", deviceService.pairDeviceWithChild(id, childId)));
    }

    @PostMapping("/{id}/unpair")
    public ResponseEntity<?> unpairDevice(@PathVariable String id) {
        return ResponseEntity.ok(Map.of("success", true, "data", deviceService.unpairDevice(id)));
    }

    @PostMapping("/bulk/command")
    public ResponseEntity<?> bulkCommand(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<String> deviceIds = (List<String>) body.get("deviceIds");
        String status = (String) body.get("status");
        deviceService.bulkStatusUpdate(deviceIds, status);
        return ResponseEntity.ok(Map.of("success", true, "message", "Bulk command executed"));
    }
}
