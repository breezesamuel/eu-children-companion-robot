package com.example.robot.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "devices")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 64)
    private String deviceId;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(length = 32)
    private String status;

    @Column(name = "battery_level")
    private Integer batteryLevel;

    @Column(name = "last_online")
    private LocalDateTime lastOnline;

    @Column(name = "is_connected")
    private Boolean isConnected;

    @Column(name = "firmware_version", length = 32)
    private String firmwareVersion;

    @Column(length = 256)
    private String ipAddress;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "child_id")
    private Child child;

    @OneToMany(mappedBy = "device", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<DeviceTelemetry> telemetryData;

    @Column(name = "temperature")
    private Double temperature;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "wifi_ssid", length = 128)
    private String wifiSsid;

    @Column(name = "signal_strength")
    private Integer signalStrength;

    @Column(name = "storage_used")
    private Long storageUsed;

    @Column(name = "memory_used")
    private Long memoryUsed;

    @Column(name = "cpu_usage")
    private Double cpuUsage;

    @Column(name = "last_heartbeat")
    private LocalDateTime lastHeartbeat;

    @Column(length = 64)
    private String model;

    @Column(length = 64)
    private String manufacturer;

    @Column(name = "serial_number", length = 128)
    private String serialNumber;

    @Column(name = "mac_address", length = 32)
    private String macAddress;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(columnDefinition = "TEXT")
    private String tags;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = "offline";
        if (isConnected == null) isConnected = false;
        if (telemetryData == null) telemetryData = new ArrayList<>();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    @Entity
    @Table(name = "device_telemetry")
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeviceTelemetry {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "device_id")
        private Device device;

        @Column(name = "metric_name", length = 64)
        private String metricName;

        @Column(name = "metric_value")
        private String metricValue;

        @Column(name = "recorded_at")
        private LocalDateTime recordedAt;
    }
}
