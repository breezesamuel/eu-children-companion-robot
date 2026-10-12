package com.example.robot.service;

import com.example.robot.entity.User;
import com.example.robot.repository.UserRepository;
import com.example.robot.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    private final Map<String, String> passwordResetTokens = new HashMap<>();

    @Transactional(readOnly = true)
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public Optional<User> getUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @Transactional(readOnly = true)
    public List<User> getUsersByRole(String role) {
        return userRepository.findByRole(role);
    }

    @Transactional(readOnly = true)
    public List<User> getActiveUsers() {
        return userRepository.findByIsActive(true);
    }

    @Transactional(readOnly = true)
    public List<User> searchUsers(String query) {
        return userRepository.searchByEmailOrName(query);
    }

    @Transactional
    public User registerWithEmail(String email, String password, String name) {
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already registered");
        }
        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .name(name)
                .role("user")
                .isActive(true)
                .emailVerified(false)
                .accountNonLocked(true)
                .failedLoginAttempts(0)
                .build();
        log.info("Registered new user: {}", email);
        return userRepository.save(user);
    }

    @Transactional
    public User createUser(User user) {
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        log.info("Creating user: {}", user.getEmail());
        return userRepository.save(user);
    }

    @Transactional
    public User updateUser(Long id, User userDetails) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (userDetails.getName() != null) user.setName(userDetails.getName());
        if (userDetails.getEmail() != null) {
            if (!user.getEmail().equals(userDetails.getEmail()) && userRepository.existsByEmail(userDetails.getEmail())) {
                throw new IllegalArgumentException("Email already exists");
            }
            user.setEmail(userDetails.getEmail());
        }
        if (userDetails.getPassword() != null && !userDetails.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(userDetails.getPassword()));
        }
        if (userDetails.getRole() != null) user.setRole(userDetails.getRole());
        if (userDetails.getPhoneNumber() != null) user.setPhoneNumber(userDetails.getPhoneNumber());
        if (userDetails.getIsActive() != null) user.setIsActive(userDetails.getIsActive());
        if (userDetails.getProfileImageUrl() != null) user.setProfileImageUrl(userDetails.getProfileImageUrl());
        if (userDetails.getAddress() != null) user.setAddress(userDetails.getAddress());
        if (userDetails.getLocale() != null) user.setLocale(userDetails.getLocale());
        if (userDetails.getTimezone() != null) user.setTimezone(userDetails.getTimezone());
        if (userDetails.getPreferences() != null) user.setPreferences(userDetails.getPreferences());
        if (userDetails.getSettings() != null) user.setSettings(userDetails.getSettings());
        if (userDetails.getNotificationPrefs() != null) user.setNotificationPrefs(userDetails.getNotificationPrefs());

        log.info("Updating user: {}", user.getEmail());
        return userRepository.save(user);
    }

    @Transactional
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        log.info("Deleting user: {}", user.getEmail());
        userRepository.delete(user);
    }

    @Transactional
    public void deactivateAccount(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setIsActive(false);
        userRepository.save(user);
        log.info("Deactivated user: {}", user.getEmail());
    }

    @Transactional(readOnly = true)
    public boolean authenticate(String email, String password) {
        Optional<User> user = userRepository.findByEmail(email);
        return user.isPresent() && passwordEncoder.matches(password, user.get().getPassword());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> authenticateAndGetToken(String email, String password) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return null;
        }
        User user = userOpt.get();
        if (!user.getAccountNonLocked() && user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now())) {
            throw new IllegalStateException("Account is locked. Try again later.");
        }
        if (!passwordEncoder.matches(password, user.getPassword())) {
            user.setFailedLoginAttempts(user.getFailedLoginAttempts() == null ? 1 : user.getFailedLoginAttempts() + 1);
            if (user.getFailedLoginAttempts() >= 5) {
                user.setAccountNonLocked(false);
                user.setLockedUntil(LocalDateTime.now().plusMinutes(30));
                log.warn("Account locked due to failed attempts: {}", email);
            }
            userRepository.save(user);
            return null;
        }
        user.setFailedLoginAttempts(0);
        user.setAccountNonLocked(true);
        user.setLockedUntil(null);
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole());
        String refreshToken = jwtUtil.generateRefreshToken(user.getId(), user.getEmail(), user.getRole());
        return Map.of(
            "token", token,
            "refreshToken", refreshToken,
            "userId", user.getId(),
            "email", user.getEmail(),
            "name", user.getName(),
            "role", user.getRole()
        );
    }

    @Transactional
    public void verifyEmail(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setEmailVerified(true);
        userRepository.save(user);
    }

    @Transactional
    public String forgotPassword(String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return null;
        }
        String token = UUID.randomUUID().toString();
        passwordResetTokens.put(token, email);
        log.info("Password reset token generated for: {}", email);
        return token;
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        String email = passwordResetTokens.get(token);
        if (email == null) {
            throw new IllegalArgumentException("Invalid or expired reset token");
        }
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        passwordResetTokens.remove(token);
        log.info("Password reset completed for: {}", email);
    }

    @Transactional
    public void updatePassword(Long userId, String oldPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public User getProfile(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    @Transactional
    public User updateProfile(Long userId, Map<String, Object> updates) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (updates.containsKey("name")) user.setName((String) updates.get("name"));
        if (updates.containsKey("phoneNumber")) user.setPhoneNumber((String) updates.get("phoneNumber"));
        if (updates.containsKey("address")) user.setAddress((String) updates.get("address"));
        if (updates.containsKey("locale")) user.setLocale((String) updates.get("locale"));
        if (updates.containsKey("timezone")) user.setTimezone((String) updates.get("timezone"));
        if (updates.containsKey("profileImageUrl")) user.setProfileImageUrl((String) updates.get("profileImageUrl"));
        if (updates.containsKey("preferences")) user.setPreferences((String) updates.get("preferences"));
        if (updates.containsKey("settings")) user.setSettings((String) updates.get("settings"));
        if (updates.containsKey("notificationPrefs")) user.setNotificationPrefs((String) updates.get("notificationPrefs"));
        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getUserStats() {
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByIsActive(true);
        long adminCount = userRepository.countByRole("admin");
        long userCount = userRepository.countByRole("user");
        return Map.of(
            "totalUsers", totalUsers,
            "activeUsers", activeUsers,
            "adminCount", adminCount,
            "userCount", userCount
        );
    }

    @Transactional(readOnly = true)
    public List<User> getUserActivity(Long userId) {
        return userRepository.findByCreatedAtBetween(LocalDateTime.now().minusDays(30), LocalDateTime.now());
    }

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void unlockExpiredAccounts() {
        List<User> lockedUsers = userRepository.findLockedAccounts(5, LocalDateTime.now());
        for (User user : lockedUsers) {
            if (user.getLockedUntil() != null && user.getLockedUntil().isBefore(LocalDateTime.now())) {
                user.setAccountNonLocked(true);
                user.setFailedLoginAttempts(0);
                user.setLockedUntil(null);
                userRepository.save(user);
                log.info("Automatically unlocked account: {}", user.getEmail());
            }
        }
    }
}
