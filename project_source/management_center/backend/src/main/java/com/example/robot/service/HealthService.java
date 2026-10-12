package com.example.robot.service;

import com.example.robot.entity.Child;
import com.example.robot.entity.HealthRecord;
import com.example.robot.repository.ChildRepository;
import com.example.robot.repository.HealthRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class HealthService {

    private final HealthRecordRepository healthRecordRepository;
    private final ChildRepository childRepository;

    @Transactional(readOnly = true)
    public List<HealthRecord> getRecordsByChild(Long childId) {
        return healthRecordRepository.findByChildId(childId);
    }

    @Transactional(readOnly = true)
    public List<HealthRecord> getRecordsByChildAndType(Long childId, String type) {
        return healthRecordRepository.findByChildIdAndType(childId, type);
    }

    @Transactional(readOnly = true)
    public List<HealthRecord> getMoodByChild(Long childId) {
        return healthRecordRepository.findByChildIdAndType(childId, "mood");
    }

    @Transactional(readOnly = true)
    public List<HealthRecord> getSleepByChild(Long childId) {
        return healthRecordRepository.findByChildIdAndType(childId, "sleep");
    }

    @Transactional(readOnly = true)
    public Optional<HealthRecord> getLatestRecord(Long childId) {
        return healthRecordRepository.findTopByChildIdOrderByCreatedAtDesc(childId);
    }

    @Transactional
    public HealthRecord createRecord(HealthRecord record) {
        if (record.getHeight() != null && record.getWeight() != null) {
            double heightM = record.getHeight() / 100.0;
            record.setBmi(Math.round(record.getWeight() / (heightM * heightM) * 10.0) / 10.0);
        }
        log.info("Creating health record: child={}, type={}", record.getChild().getId(), record.getType());
        return healthRecordRepository.save(record);
    }

    @Transactional
    public HealthRecord updateRecord(Long id, HealthRecord details) {
        HealthRecord record = healthRecordRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Health record not found"));
        if (details.getMood() != null) record.setMood(details.getMood());
        if (details.getMoodIntensity() != null) record.setMoodIntensity(details.getMoodIntensity());
        if (details.getSleepHours() != null) record.setSleepHours(details.getSleepHours());
        if (details.getSleepQuality() != null) record.setSleepQuality(details.getSleepQuality());
        if (details.getEnergyLevel() != null) record.setEnergyLevel(details.getEnergyLevel());
        if (details.getHeight() != null) record.setHeight(details.getHeight());
        if (details.getWeight() != null) record.setWeight(details.getWeight());
        if (details.getHeadCircumference() != null) record.setHeadCircumference(details.getHeadCircumference());
        if (details.getVisionTest() != null) record.setVisionTest(details.getVisionTest());
        if (details.getHearingTest() != null) record.setHearingTest(details.getHearingTest());
        if (details.getBloodPressure() != null) record.setBloodPressure(details.getBloodPressure());
        if (details.getHeartRate() != null) record.setHeartRate(details.getHeartRate());
        if (details.getBodyTemperature() != null) record.setBodyTemperature(details.getBodyTemperature());
        if (details.getNotes() != null) record.setNotes(details.getNotes());
        if (details.getSymptoms() != null) record.setSymptoms(details.getSymptoms());
        if (details.getDiagnosis() != null) record.setDiagnosis(details.getDiagnosis());
        if (details.getMedication() != null) record.setMedication(details.getMedication());
        if (details.getDoctorName() != null) record.setDoctorName(details.getDoctorName());
        if (details.getHospital() != null) record.setHospital(details.getHospital());
        if (details.getFollowUpDate() != null) record.setFollowUpDate(details.getFollowUpDate());
        if (record.getHeight() != null && record.getWeight() != null) {
            double heightM = record.getHeight() / 100.0;
            record.setBmi(Math.round(record.getWeight() / (heightM * heightM) * 10.0) / 10.0);
        }
        return healthRecordRepository.save(record);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> calculateBMI(Long childId) {
        HealthRecord latest = healthRecordRepository.findTopByChildIdOrderByCreatedAtDesc(childId)
                .orElseThrow(() -> new IllegalArgumentException("No health records found"));
        if (latest.getBmi() == null) {
            return Map.of("bmi", "N/A", "category", "unknown");
        }
        double bmi = latest.getBmi();
        String category;
        if (bmi < 14) category = "underweight";
        else if (bmi < 18.5) category = "normal";
        else if (bmi < 25) category = "overweight";
        else category = "obese";
        return Map.of("bmi", bmi, "category", category, "height", latest.getHeight(), "weight", latest.getWeight());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getGrowthPercentile(Long childId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new IllegalArgumentException("Child not found"));
        List<HealthRecord> records = healthRecordRepository.findByChildId(childId);
        List<HealthRecord> growthRecords = records.stream()
                .filter(r -> r.getHeight() != null && r.getWeight() != null)
                .sorted(Comparator.comparing(HealthRecord::getCreatedAt))
                .toList();

        return Map.of(
            "childId", childId,
            "ageYears", child.getAgeYears(),
            "heightRecords", growthRecords.stream().map(r -> Map.of("date", r.getRecordDate(), "height", r.getHeight(), "weight", r.getWeight())).toList(),
            "latestHeight", growthRecords.isEmpty() ? null : growthRecords.get(growthRecords.size() - 1).getHeight(),
            "latestWeight", growthRecords.isEmpty() ? null : growthRecords.get(growthRecords.size() - 1).getWeight()
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getHealthScore(Long childId) {
        List<HealthRecord> records = healthRecordRepository.findByChildId(childId);
        if (records.isEmpty()) return Map.of("score", 0, "factors", List.of());

        double avgSleep = records.stream().filter(r -> r.getSleepHours() != null).mapToDouble(HealthRecord::getSleepHours).average().orElse(0);
        double avgEnergy = records.stream().filter(r -> r.getEnergyLevel() != null).mapToInt(HealthRecord::getEnergyLevel).average().orElse(0);
        double avgMoodIntensity = records.stream().filter(r -> r.getMoodIntensity() != null).mapToInt(HealthRecord::getMoodIntensity).average().orElse(0);

        double sleepScore = Math.min(avgSleep / 10.0, 1.0) * 33;
        double energyScore = (avgEnergy / 5.0) * 33;
        double moodScore = (1.0 - Math.abs(avgMoodIntensity - 3) / 3.0) * 34;
        double totalScore = Math.round((sleepScore + energyScore + moodScore) * 10.0) / 10.0;

        return Map.of(
            "score", totalScore,
            "factors", Map.of("sleep", sleepScore, "energy", energyScore, "mood", moodScore),
            "avgSleepHours", Math.round(avgSleep * 10.0) / 10.0,
            "avgEnergyLevel", Math.round(avgEnergy * 10.0) / 10.0
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getVaccinationSchedule(Long childId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new IllegalArgumentException("Child not found"));
        int ageMonths = child.getAgeMonths();
        List<Map<String, Object>> schedule = new ArrayList<>();

        if (ageMonths >= 0) schedule.add(Map.of("vaccine", "Hepatitis B", "due", "Birth", "status", ageMonths >= 1 ? "completed" : "pending"));
        if (ageMonths >= 2) schedule.add(Map.of("vaccine", "DTaP", "due", "2 months", "status", ageMonths >= 6 ? "completed" : "pending"));
        if (ageMonths >= 12) schedule.add(Map.of("vaccine", "MMR", "due", "12 months", "status", ageMonths >= 15 ? "completed" : "pending"));
        if (ageMonths >= 48) schedule.add(Map.of("vaccine", "COVID-19", "due", "4 years", "status", ageMonths >= 60 ? "completed" : "pending"));

        return Map.of("childId", childId, "ageMonths", ageMonths, "schedule", schedule);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getHealthAlerts(Long childId) {
        List<HealthRecord> records = healthRecordRepository.findByChildId(childId);
        List<String> alerts = new ArrayList<>();

        records.stream().filter(r -> r.getBodyTemperature() != null && r.getBodyTemperature() > 37.5)
                .findAny().ifPresent(r -> alerts.add("Fever detected: " + r.getBodyTemperature() + "C"));
        records.stream().filter(r -> r.getHeartRate() != null && (r.getHeartRate() > 140 || r.getHeartRate() < 60))
                .findAny().ifPresent(r -> alerts.add("Abnormal heart rate: " + r.getHeartRate() + " bpm"));
        records.stream().filter(r -> r.getSleepHours() != null && r.getSleepHours() < 6)
                .findAny().ifPresent(r -> alerts.add("Insufficient sleep: " + r.getSleepHours() + " hours"));

        return Map.of("childId", childId, "alerts", alerts, "alertCount", alerts.size());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> generateHealthReport(Long childId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new IllegalArgumentException("Child not found"));
        List<HealthRecord> records = healthRecordRepository.findByChildId(childId);
        var moods = records.stream().filter(r -> "mood".equals(r.getType())).toList();
        var sleeps = records.stream().filter(r -> "sleep".equals(r.getType())).toList();
        var checkins = records.stream().filter(r -> "checkin".equals(r.getType())).toList();
        double avgSleep = sleeps.stream().filter(r -> r.getSleepHours() != null).mapToDouble(HealthRecord::getSleepHours).average().orElse(0);
        double avgEnergy = checkins.stream().filter(r -> r.getEnergyLevel() != null).mapToInt(HealthRecord::getEnergyLevel).average().orElse(0);

        return Map.of(
            "childId", childId,
            "childName", child.getName(),
            "ageYears", child.getAgeYears(),
            "totalRecords", records.size(),
            "moodCount", moods.size(),
            "sleepCount", sleeps.size(),
            "avgSleepHours", Math.round(avgSleep * 10.0) / 10.0,
            "avgEnergyLevel", Math.round(avgEnergy * 10.0) / 10.0,
            "recentMoods", moods.stream().limit(7).map(r -> Map.of("mood", r.getMood(), "date", r.getRecordDate())).toList(),
            "growthData", getGrowthPercentile(childId)
        );
    }

    @Transactional(readOnly = true)
    public String exportHealthData(Long childId) {
        List<HealthRecord> records = healthRecordRepository.findByChildId(childId);
        StringBuilder sb = new StringBuilder("Date,Type,Mood,Energy,Sleep,Height,Weight,BMI,Notes\n");
        for (HealthRecord r : records) {
            sb.append(r.getRecordDate()).append(",")
              .append(r.getType()).append(",")
              .append(r.getMood()).append(",")
              .append(r.getEnergyLevel()).append(",")
              .append(r.getSleepHours()).append(",")
              .append(r.getHeight()).append(",")
              .append(r.getWeight()).append(",")
              .append(r.getBmi()).append(",")
              .append(r.getNotes() != null ? r.getNotes().replace(",", ";") : "").append("\n");
        }
        return sb.toString();
    }

    @Transactional
    public void deleteRecord(Long id) {
        healthRecordRepository.deleteById(id);
        log.info("Deleted health record: {}", id);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getReport(Long childId) {
        List<HealthRecord> records = healthRecordRepository.findByChildId(childId);
        var moods = records.stream().filter(r -> "mood".equals(r.getType())).toList();
        var sleeps = records.stream().filter(r -> "sleep".equals(r.getType())).toList();
        var checkins = records.stream().filter(r -> "checkin".equals(r.getType())).toList();
        double avgSleep = sleeps.stream().filter(r -> r.getSleepHours() != null).mapToDouble(HealthRecord::getSleepHours).average().orElse(0);
        double avgEnergy = checkins.stream().filter(r -> r.getEnergyLevel() != null).mapToInt(HealthRecord::getEnergyLevel).average().orElse(0);
        return Map.of(
            "childId", childId,
            "totalRecords", records.size(),
            "moodCount", moods.size(),
            "sleepCount", sleeps.size(),
            "avgSleepHours", Math.round(avgSleep * 10.0) / 10.0,
            "avgEnergyLevel", Math.round(avgEnergy * 10.0) / 10.0,
            "recentMoods", moods.stream().limit(7).map(r -> Map.of("mood", r.getMood(), "date", r.getRecordDate())).toList()
        );
    }
}
