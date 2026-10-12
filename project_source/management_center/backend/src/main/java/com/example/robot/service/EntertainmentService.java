package com.example.robot.service;

import com.example.robot.entity.EntertainmentItem;
import com.example.robot.repository.EntertainmentItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class EntertainmentService {

    private final EntertainmentItemRepository entertainmentItemRepository;

    private final Map<String, List<Long>> playlists = new HashMap<>();

    @Transactional(readOnly = true)
    public List<EntertainmentItem> getAll() {
        return entertainmentItemRepository.findByIsActiveTrue();
    }

    @Transactional(readOnly = true)
    public List<EntertainmentItem> getByCategory(String category) {
        return entertainmentItemRepository.findByCategoryAndIsActiveTrue(category);
    }

    @Transactional(readOnly = true)
    public Optional<EntertainmentItem> getById(Long id) {
        return entertainmentItemRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public List<EntertainmentItem> getByGenre(String genre) {
        return entertainmentItemRepository.findByCategory(genre);
    }

    @Transactional(readOnly = true)
    public List<EntertainmentItem> getByMood(String mood) {
        return entertainmentItemRepository.searchByTitleAndDescription(mood);
    }

    @Transactional(readOnly = true)
    public List<EntertainmentItem> getByAge(String ageRange) {
        return entertainmentItemRepository.findByAgeRangeContaining(ageRange);
    }

    @Transactional(readOnly = true)
    public List<EntertainmentItem> getTrending() {
        return entertainmentItemRepository.findTrending();
    }

    @Transactional(readOnly = true)
    public List<EntertainmentItem> getRecommended(String category) {
        if (category != null && !category.isBlank()) {
            return entertainmentItemRepository.findPopularByCategory(category);
        }
        return entertainmentItemRepository.findTopRated();
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getCategoryStats() {
        Map<String, Long> stats = new LinkedHashMap<>();
        for (String cat : List.of("music", "game", "story", "video")) {
            stats.put(cat, entertainmentItemRepository.countByCategory(cat));
        }
        return stats;
    }

    @Transactional(readOnly = true)
    public List<EntertainmentItem> searchMedia(String query) {
        return entertainmentItemRepository.searchByTitleAndDescription(query);
    }

    @Transactional
    public EntertainmentItem createMedia(EntertainmentItem item) {
        item.setCreatedAt(LocalDateTime.now());
        log.info("Creating entertainment: {}", item.getTitle());
        return entertainmentItemRepository.save(item);
    }

    @Transactional
    public EntertainmentItem updateMedia(Long id, EntertainmentItem details) {
        EntertainmentItem item = entertainmentItemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Entertainment item not found"));
        if (details.getTitle() != null) item.setTitle(details.getTitle());
        if (details.getCategory() != null) item.setCategory(details.getCategory());
        if (details.getDescription() != null) item.setDescription(details.getDescription());
        if (details.getMediaUrl() != null) item.setMediaUrl(details.getMediaUrl());
        if (details.getThumbnailUrl() != null) item.setThumbnailUrl(details.getThumbnailUrl());
        if (details.getDuration() != null) item.setDuration(details.getDuration());
        if (details.getAgeRange() != null) item.setAgeRange(details.getAgeRange());
        if (details.getAgeRating() != null) item.setAgeRating(details.getAgeRating());
        if (details.getLanguage() != null) item.setLanguage(details.getLanguage());
        if (details.getTags() != null) item.setTags(details.getTags());
        if (details.getMetadata() != null) item.setMetadata(details.getMetadata());
        if (details.getIsActive() != null) item.setIsActive(details.getIsActive());
        if (details.getPopularity() != null) item.setPopularity(details.getPopularity());
        if (details.getRating() != null) item.setRating(details.getRating());
        log.info("Updating entertainment: {}", item.getTitle());
        return entertainmentItemRepository.save(item);
    }

    @Transactional
    public void deleteMedia(Long id) {
        EntertainmentItem item = entertainmentItemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Entertainment item not found"));
        item.setIsActive(false);
        entertainmentItemRepository.save(item);
        log.info("Soft-deleted entertainment: {}", id);
    }

    @Transactional
    public EntertainmentItem rateMedia(Long id, Double rating) {
        EntertainmentItem item = entertainmentItemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Entertainment item not found"));
        if (item.getRating() == null) {
            item.setRating(rating);
        } else {
            item.setRating((item.getRating() + rating) / 2.0);
        }
        item.setPopularity(item.getPopularity() == null ? 1 : item.getPopularity() + 1);
        return entertainmentItemRepository.save(item);
    }

    @Transactional
    public EntertainmentItem recordPlay(Long id) {
        EntertainmentItem item = entertainmentItemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Entertainment item not found"));
        item.setViewCount(item.getViewCount() == null ? 1 : item.getViewCount() + 1);
        item.setPopularity(item.getPopularity() == null ? 1 : item.getPopularity() + 1);
        return entertainmentItemRepository.save(item);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getPlayStats() {
        List<EntertainmentItem> all = entertainmentItemRepository.findByIsActiveTrue();
        long totalPlays = all.stream().filter(i -> i.getViewCount() != null).mapToLong(EntertainmentItem::getViewCount).sum();
        return Map.of(
            "totalItems", all.size(),
            "totalPlays", totalPlays,
            "byCategory", all.stream().collect(Collectors.groupingBy(EntertainmentItem::getCategory, Collectors.counting()))
        );
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPlaylists() {
        return playlists.entrySet().stream()
                .map(e -> Map.<String, Object>of("name", e.getKey(), "itemCount", e.getValue().size()))
                .toList();
    }

    @Transactional
    public Map<String, Object> createPlaylist(String name) {
        playlists.put(name, new ArrayList<>());
        return Map.of("name", name, "itemCount", 0);
    }

    @Transactional
    public void addToPlaylist(String playlistName, Long itemId) {
        playlists.computeIfAbsent(playlistName, k -> new ArrayList<>()).add(itemId);
    }

    @Transactional
    public void removeFromPlaylist(String playlistName, Long itemId) {
        List<Long> items = playlists.get(playlistName);
        if (items != null) {
            items.remove(itemId);
        }
    }

    @Transactional
    public EntertainmentItem create(EntertainmentItem item) {
        item.setCreatedAt(LocalDateTime.now());
        return entertainmentItemRepository.save(item);
    }

    @Transactional
    public void delete(Long id) {
        entertainmentItemRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getPlaylistDetail(String name) {
        List<Long> itemIds = playlists.get(name);
        if (itemIds == null) return Map.of("name", name, "items", List.of());
        List<EntertainmentItem> items = itemIds.stream()
                .map(entertainmentItemRepository::findById)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .toList();
        return Map.of("name", name, "items", items);
    }
}
