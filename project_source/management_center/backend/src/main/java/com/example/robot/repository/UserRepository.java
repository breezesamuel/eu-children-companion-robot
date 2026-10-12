package com.example.robot.repository;

import com.example.robot.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    List<User> findByRole(String role);

    List<User> findByIsActive(Boolean isActive);

    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u WHERE LOWER(u.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<User> searchByName(@Param("name") String name);

    List<User> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role")
    long countByRole(@Param("role") String role);

    List<User> findByLastLoginBefore(LocalDateTime dateTime);

    List<User> findByEmailVerified(Boolean emailVerified);

    @Query("SELECT u FROM User u WHERE u.email LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(u.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<User> searchByEmailOrName(@Param("query") String query);

    @Query("SELECT u FROM User u WHERE u.failedLoginAttempts >= :attempts AND u.lockedUntil > :now")
    List<User> findLockedAccounts(@Param("attempts") int attempts, @Param("now") LocalDateTime now);

    List<User> findByAccountNonLocked(Boolean accountNonLocked);

    long countByIsActive(Boolean isActive);

    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
}
