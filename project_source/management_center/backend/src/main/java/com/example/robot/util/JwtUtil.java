package com.example.robot.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class JwtUtil {

    private final SecretKey accessKey;
    private final SecretKey refreshKey;
    private final long accessExpiration;
    private final long refreshExpiration;
    private final Set<String> tokenBlacklist = ConcurrentHashMap.newKeySet();
    private final Map<String, Map<String, Object>> tokenMetadata = new ConcurrentHashMap<>();

    public JwtUtil(@Value("${security.jwt.secret:your-256-bit-secret-key-for-robot-mgmt-center}") String secret,
                   @Value("${security.jwt.refresh-secret:your-256-bit-refresh-secret-key-for-robot-mgmt}") String refreshSecret,
                   @Value("${security.jwt.expiration:86400000}") long accessExpiration,
                   @Value("${security.jwt.refresh-expiration:604800000}") long refreshExpiration) {
        this.accessKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.refreshKey = Keys.hmacShaKeyFor(refreshSecret.getBytes(StandardCharsets.UTF_8));
        this.accessExpiration = accessExpiration;
        this.refreshExpiration = refreshExpiration;
    }

    public String generateToken(Long userId, String email, String role) {
        String token = Jwts.builder()
                .subject(email)
                .claim("userId", userId)
                .claim("role", role)
                .claim("type", "access")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + accessExpiration))
                .signWith(accessKey)
                .compact();

        storeMetadata(token, userId, email, role);
        return token;
    }

    public String generateRefreshToken(Long userId, String email, String role) {
        String token = Jwts.builder()
                .subject(email)
                .claim("userId", userId)
                .claim("role", role)
                .claim("type", "refresh")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + refreshExpiration))
                .signWith(refreshKey)
                .compact();
        return token;
    }

    public String refreshAccessToken(String refreshToken) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(refreshKey)
                    .build()
                    .parseSignedClaims(refreshToken)
                    .getPayload();

            if (!"refresh".equals(claims.get("type"))) {
                return null;
            }
            Long userId = claims.get("userId", Long.class);
            String email = claims.getSubject();
            String role = claims.get("role", String.class);
            return generateToken(userId, email, role);
        } catch (Exception e) {
            return null;
        }
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(accessKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean validateToken(String token) {
        try {
            if (tokenBlacklist.contains(token)) {
                return false;
            }
            Claims claims = parseToken(token);
            return !claims.getExpiration().before(new Date());
        } catch (Exception e) {
            return false;
        }
    }

    public void blacklistToken(String token) {
        tokenBlacklist.add(token);
        tokenMetadata.remove(token);
    }

    public boolean isTokenBlacklisted(String token) {
        return tokenBlacklist.contains(token);
    }

    public String rotateToken(String token) {
        try {
            Claims claims = parseToken(token);
            Long userId = claims.get("userId", Long.class);
            String email = claims.getSubject();
            String role = claims.get("role", String.class);
            blacklistToken(token);
            return generateToken(userId, email, role);
        } catch (Exception e) {
            return null;
        }
    }

    public Long getUserIdFromToken(String token) {
        return parseToken(token).get("userId", Long.class);
    }

    public String getRoleFromToken(String token) {
        return parseToken(token).get("role", String.class);
    }

    public String getEmailFromToken(String token) {
        return parseToken(token).getSubject();
    }

    public long getExpirationFromToken(String token) {
        return parseToken(token).getExpiration().getTime();
    }

    public Date getIssuedAtFromToken(String token) {
        return parseToken(token).getIssuedAt();
    }

    public String getTokenType(String token) {
        return parseToken(token).get("type", String.class);
    }

    public long getTimeToLive(String token) {
        try {
            Claims claims = parseToken(token);
            return claims.getExpiration().getTime() - System.currentTimeMillis();
        } catch (Exception e) {
            return 0;
        }
    }

    public String extractTokenFromCookies(HttpServletRequest request, String cookieName) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            return Arrays.stream(cookies)
                    .filter(c -> cookieName.equals(c.getName()))
                    .map(Cookie::getValue)
                    .findFirst()
                    .orElse(null);
        }
        return null;
    }

    public long getAccessExpiration() {
        return accessExpiration;
    }

    public long getRefreshExpiration() {
        return refreshExpiration;
    }

    private void storeMetadata(String token, Long userId, String email, String role) {
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("userId", userId);
        metadata.put("email", email);
        metadata.put("role", role);
        metadata.put("issuedAt", new Date());
        metadata.put("lastUsed", new Date());
        tokenMetadata.put(token, metadata);
    }

    public void updateLastUsed(String token) {
        Map<String, Object> metadata = tokenMetadata.get(token);
        if (metadata != null) {
            metadata.put("lastUsed", new Date());
        }
    }

    public Map<String, Object> getTokenMetadata(String token) {
        return tokenMetadata.get(token);
    }
}
