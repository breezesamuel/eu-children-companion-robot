package com.example.robot.service;

import com.example.robot.entity.Child;
import com.example.robot.entity.Device;
import com.example.robot.repository.ChildRepository;
import com.example.robot.repository.DeviceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final ChildRepository childRepository;

    @Transactional(readOnly = true)
    public List<Device> getAllDevices() {
        return deviceRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Device> getDeviceById(Long id) {
        return deviceRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public Optional<Device> getDeviceByDeviceId(String deviceId) {
        return deviceRepository.findByDeviceId(deviceId);
    }

    @Transactional(readOnly = true)
    public List<Device> getDevicesByStatus(String status) {
        return deviceRepository.findByStatus(status);
    }

    @Transactional(readOnly = true)
    public List<Device> getOnlineDevices() {
        return deviceRepository.findByIsConnected(true);
    }

    @Transactional
    public Device createDevice(Device device) {
        if (deviceRepository.existsByDeviceId(device.getDeviceId())) {
            throw new IllegalArgumentException("Device ID already exists");
        }
        log.info("Creating device: {}", device.getName());
        return deviceRepository.save(device);
    }

    @Transactional
    public Device updateDevice(Long id, Device deviceDetails) {
        Device device = deviceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Device not found"));

        if (deviceDetails.getName() != null) device.setName(deviceDetails.getName());
        if (deviceDetails.getStatus() != null) device.setStatus(deviceDetails.getStatus());
        if (deviceDetails.getBatteryLevel() != null) device.setBatteryLevel(deviceDetails.getBatteryLevel());
        if (deviceDetails.getIsConnected() != null) {
            device.setIsConnected(deviceDetails.getIsConnected());
            if (deviceDetails.getIsConnected()) {
                device.setLastOnline(LocalDateTime.now());
            }
        }
        if (deviceDetails.getFirmwareVersion() != null) device.setFirmwareVersion(deviceDetails.getFirmwareVersion());
        if (deviceDetails.getIpAddress() != null) device.setIpAddress(deviceDetails.getIpAddress());
        if (deviceDetails.getTemperature() != null) device.setTemperature(deviceDetails.getTemperature());
        if (deviceDetails.getLatitude() != null) device.setLatitude(deviceDetails.getLatitude());
        if (deviceDetails.getLongitude() != null) device.setLongitude(deviceDetails.getLongitude());
        if (deviceDetails.getWifiSsid() != null) device.setWifiSsid(deviceDetails.getWifiSsid());
        if (deviceDetails.getSignalStrength() != null) device.setSignalStrength(deviceDetails.getSignalStrength());
        if (deviceDetails.getCpuUsage() != null) device.setCpuUsage(deviceDetails.getCpuUsage());
        if (deviceDetails.getStorageUsed() != null) device.setStorageUsed(deviceDetails.getStorageUsed());
        if (deviceDetails.getMemoryUsed() != null) device.setMemoryUsed(deviceDetails.getMemoryUsed());
        if (deviceDetails.getNotes() != null) device.setNotes(deviceDetails.getNotes());
        if (deviceDetails.getTags() != null) device.setTags(deviceDetails.getTags());

        log.info("Updating device: {}", device.getName());
        return deviceRepository.save(device);
    }

    @Transactional
    public void deleteDevice(Long id) {
        Device device = deviceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Device not found"));
        log.info("Deleting device: {}", device.getName());
        deviceRepository.delete(device);
    }

    @Transactional
    public Device updateDeviceStatus(String deviceId, String status) {
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Device not found"));
        device.setStatus(status);
        device.setIsConnected("online".equals(status));
        if ("online".equals(status)) {
            device.setLastOnline(LocalDateTime.now());
        }
        log.info("Updating device status: {} -> {}", deviceId, status);
        return deviceRepository.save(device);
    }

    @Transactional
    public Device updateBatteryLevel(String deviceId, Integer batteryLevel) {
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Device not found"));
        device.setBatteryLevel(batteryLevel);
        log.info("Updating battery level: {} -> {}%", deviceId, batteryLevel);
        return deviceRepository.save(device);
    }

    @Transactional
    public Device recordHeartbeat(String deviceId, Map<String, Object> telemetry) {
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Device not found"));
        device.setLastHeartbeat(LocalDateTime.now());
        device.setLastOnline(LocalDateTime.now());
        device.setIsConnected(true);
        device.setStatus("online");

        if (telemetry.containsKey("batteryLevel")) {
            device.setBatteryLevel((Integer) telemetry.get("batteryLevel"));
        }
        if (telemetry.containsKey("temperature")) {
            device.setTemperature((Double) telemetry.get("temperature"));
        }
        if (telemetry.containsKey("signalStrength")) {
            device.setSignalStrength((Integer) telemetry.get("signalStrength"));
        }
        if (telemetry.containsKey("cpuUsage")) {
            device.setCpuUsage((Double) telemetry.get("cpuUsage"));
        }
        if (telemetry.containsKey("storageUsed")) {
            device.setStorageUsed((Long) telemetry.get("storageUsed"));
        }
        if (telemetry.containsKey("memoryUsed")) {
            device.setMemoryUsed((Long) telemetry.get("memoryUsed"));
        }
        return deviceRepository.save(device);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getDeviceStats() {
        long total = deviceRepository.count();
        long online = deviceRepository.findByIsConnected(true).size();
        long offline = deviceRepository.findByIsConnected(false).size();
        long lowBattery = deviceRepository.findByBatteryLevelLessThan(20).size();
        long onlineCount = deviceRepository.countByStatus("online");

        return Map.of(
            "total", total,
            "online", online,
            "offline", offline,
            "lowBattery", lowBattery,
            "onlineCount", onlineCount
        );
    }

    @Transactional(readOnly = true)
    public List<Device> getDevicesByModel(String model) {
        return deviceRepository.findByModel(model);
    }

    @Transactional
    public Device updateFirmware(String deviceId, String firmwareVersion) {
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Device not found"));
        device.setFirmwareVersion(firmwareVersion);
        log.info("Firmware updated for {}: {}", deviceId, firmwareVersion);
        return deviceRepository.save(device);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> runDiagnostics(String deviceId) {
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Device not found"));
        List<String> issues = new java.util.ArrayList<>();
        if (device.getBatteryLevel() != null && device.getBatteryLevel() < 20) {
            issues.add("Low battery: " + device.getBatteryLevel() + "%");
        }
        if (device.getSignalStrength() != null && device.getSignalStrength() < 30) {
            issues.add("Weak signal: " + device.getSignalStrength());
        }
        if (device.getCpuUsage() != null && device.getCpuUsage() > 90) {
            issues.add("High CPU usage: " + device.getCpuUsage() + "%");
        }
        if (device.getStorageUsed() != null && device.getStorageUsed() > 90L * 1024 * 1024 * 1024) {
            issues.add("Storage nearly full");
        }
        if (device.getTemperature() != null && (device.getTemperature() > 60 || device.getTemperature() < 0)) {
            issues.add("Temperature out of range: " + device.getTemperature() + "C");
        }
        if (!device.getIsConnected()) {
            issues.add("Device is offline");
        }
        return Map.of(
            "deviceId", deviceId,
            "status", issues.isEmpty() ? "healthy" : "issues_found",
            "issues", issues,
            "battery", device.getBatteryLevel(),
            "signalStrength", device.getSignalStrength(),
            "cpuUsage", device.getCpuUsage(),
            "temperature", device.getTemperature(),
            "connected", device.getIsConnected()
        );
    }

    @Transactional(readOnly = true)
    public List<Device> getNearbyDevices(Double latitude, Double longitude, Double radiusKm) {
        return getAllDevices().stream()
                .filter(d -> d.getLatitude() != null && d.getLongitude() != null)
                .filter(d -> calculateDistance(latitude, longitude, d.getLatitude(), d.getLongitude()) <= radiusKm)
                .toList();
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    @Transactional(readOnly = true)
    public List<Device> getOfflineDevices() {
        return deviceRepository.findByIsConnected(false);
    }

    @Transactional
    public Device pairDeviceWithChild(String deviceId, Long childId) {
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Device not found"));
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new IllegalArgumentException("Child not found"));
        device.setChild(child);
        log.info("Device {} paired with child {}", deviceId, childId);
        return deviceRepository.save(device);
    }

    @Transactional
    public Device unpairDevice(String deviceId) {
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Device not found"));
        device.setChild(null);
        log.info("Device {} unpaired", deviceId);
        return deviceRepository.save(device);
    }

    @Transactional(readOnly = true)
    public List<Device> getBatteryAlerts() {
        return deviceRepository.findByBatteryLevelLessThan(20);
    }

    @Transactional(readOnly = true)
    public List<Device> getTemperatureAlerts() {
        return deviceRepository.findByTemperatureBetween(-100.0, 0.0);
    }

    @Transactional
    public void bulkStatusUpdate(List<String> deviceIds, String status) {
        for (String id : deviceIds) {
            updateDeviceStatus(id, status);
        }
        log.info("Bulk status update: {} devices -> {}", deviceIds.size(), status);
    }
}
