package com.example.robot.controller;

import com.example.robot.entity.User;
import com.example.robot.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping("/auth/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");
        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email and password required"));
        }
        try {
            var result = userService.authenticateAndGetToken(email, password);
            if (result == null) {
                return ResponseEntity.status(401).body(Map.of("success", false, "message", "Invalid credentials"));
            }
            return ResponseEntity.ok(Map.of("success", true, "data", result));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(423).body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/auth/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            String password = body.get("password");
            String name = body.get("name");
            if (email == null || password == null || name == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email, password, and name required"));
            }
            var created = userService.registerWithEmail(email, password, name);
            return ResponseEntity.ok(Map.of("success", true, "data", Map.of(
                "id", created.getId(), "email", created.getEmail(), "name", created.getName()
            )));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/auth/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String token = userService.forgotPassword(body.get("email"));
        if (token == null) {
            return ResponseEntity.ok(Map.of("success", true, "message", "If email exists, a reset token was sent"));
        }
        return ResponseEntity.ok(Map.of("success", true, "data", Map.of("resetToken", token)));
    }

    @PostMapping("/auth/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        try {
            userService.resetPassword(body.get("token"), body.get("newPassword"));
            return ResponseEntity.ok(Map.of("success", true, "message", "Password reset successful"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        return ResponseEntity.ok(Map.of("success", true, "data", userService.getAllUsers()));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        return userService.getUserById(id)
                .map(u -> ResponseEntity.ok(Map.of("success", true, "data", u)))
                .orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "User not found")));
    }

    @GetMapping("/users/email/{email}")
    public ResponseEntity<?> getUserByEmail(@PathVariable String email) {
        return userService.getUserByEmail(email)
                .map(u -> ResponseEntity.ok(Map.of("success", true, "data", u)))
                .orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "User not found")));
    }

    @GetMapping("/users/role/{role}")
    public ResponseEntity<?> getUsersByRole(@PathVariable String role) {
        return ResponseEntity.ok(Map.of("success", true, "data", userService.getUsersByRole(role)));
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(Map.of("success", true, "data", userService.getProfile(userId)));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(Authentication auth, @RequestBody Map<String, Object> updates) {
        try {
            Long userId = (Long) auth.getPrincipal();
            return ResponseEntity.ok(Map.of("success", true, "data", userService.updateProfile(userId, updates)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchUsers(@RequestParam String q) {
        return ResponseEntity.ok(Map.of("success", true, "data", userService.searchUsers(q)));
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getUserStats() {
        return ResponseEntity.ok(Map.of("success", true, "data", userService.getUserStats()));
    }

    @PatchMapping("/users/{id}/deactivate")
    public ResponseEntity<?> deactivateUser(@PathVariable Long id) {
        try {
            userService.deactivateAccount(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "User deactivated"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PatchMapping("/users/{id}/role")
    public ResponseEntity<?> updateRole(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            User user = userService.getUserById(id)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            user.setRole(body.get("role"));
            User updated = userService.updateUser(id, user);
            return ResponseEntity.ok(Map.of("success", true, "data", updated));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/activity/{id}")
    public ResponseEntity<?> getUserActivity(@PathVariable Long id) {
        return ResponseEntity.ok(Map.of("success", true, "data", userService.getUserActivity(id)));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody User user) {
        try {
            return ResponseEntity.ok(Map.of("success", true, "data", userService.updateUser(id, user)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        try {
            userService.deleteUser(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "User deleted"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}
