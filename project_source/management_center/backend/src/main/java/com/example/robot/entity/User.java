package com.example.robot.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 128)
    private String email;

    @Column(nullable = false, length = 256)
    private String password;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(length = 512)
    private String profileImageUrl;

    @Column(name = "phone_number", length = 32)
    private String phoneNumber;

    @Column(length = 256)
    private String address;

    @Column(length = 16)
    private String locale;

    @Column(name = "email_verified")
    private Boolean emailVerified;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    @Column(columnDefinition = "TEXT")
    private String preferences;

    @Column(columnDefinition = "TEXT")
    private String settings;

    @Column(columnDefinition = "TEXT")
    private String notificationPrefs;

    @Column(length = 64)
    private String timezone;

    @Column(name = "account_non_locked")
    private Boolean accountNonLocked;

    @Column(name = "failed_login_attempts")
    private Integer failedLoginAttempts;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @Column(length = 32)
    private String role;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "is_active")
    private Boolean isActive;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_devices",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "device_id")
    )
    private List<Device> devices;

    @OneToMany(mappedBy = "parent", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<Child> children;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Role> roles;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (role == null) role = "user";
        if (isActive == null) isActive = true;
        if (emailVerified == null) emailVerified = false;
        if (accountNonLocked == null) accountNonLocked = true;
        if (failedLoginAttempts == null) failedLoginAttempts = 0;
        if (locale == null) locale = "en";
        if (timezone == null) timezone = "UTC";
        if (roles == null) roles = new HashSet<>();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
