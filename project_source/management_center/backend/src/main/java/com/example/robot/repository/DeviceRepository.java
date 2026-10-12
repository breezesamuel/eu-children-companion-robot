package com.example.robot.repository;

import com.example.robot.entity.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceRepository extends JpaRepository<Device, Long> {

    Optional<Device> findByDeviceId(String deviceId);

    List<Device> findByStatus(String status);

    List<Device> findByIsConnected(Boolean isConnected);

    List<Device> findByNameContaining(String name);

    boolean existsByDeviceId(String deviceId);

    List<Device> findByModel(String model);

    List<Device> findByFirmwareVersion(String firmwareVersion);

    @Query("SELECT d FROM Device d WHERE d.temperature BETWEEN :min AND :max")
    List<Device> findByTemperatureBetween(@Param("min") Double min, @Param("max") Double max);

    @Query("SELECT d FROM Device d WHERE d.status IN :statuses")
    List<Device> findByStatusIn(@Param("statuses") List<String> statuses);

    List<Device> findByBatteryLevelLessThan(Integer batteryLevel);

    List<Device> findByNameContainingIgnoreCase(String name);

    @Query(value = "SELECT * FROM devices WHERE name LIKE %:query% OR device_id LIKE %:query% OR model LIKE %:query%", nativeQuery = true)
    List<Device> search(@Param("query") String query);

    @Query("SELECT COUNT(d) FROM Device d WHERE d.status = :status")
    long countByStatus(@Param("status") String status);

    List<Device> findByLastHeartbeatBefore(LocalDateTime dateTime);

    @Query("SELECT d FROM Device d WHERE d.signalStrength < :threshold")
    List<Device> findByWeakSignal(@Param("threshold") Integer threshold);

    @Query("SELECT d FROM Device d WHERE d.storageUsed > :threshold")
    List<Device> findByHighStorageUsage(@Param("threshold") Long threshold);

    long countByChildId(Long childId);
}
