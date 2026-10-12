package com.example.robot.config;

import com.example.robot.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private static final List<String> PUBLIC_PATHS = List.of("/api/auth/login", "/api/auth/register", "/api/auth/forgot-password", "/api/auth/reset-password", "/health", "/swagger-ui", "/api-docs", "/ws");
    private final ConcurrentHashMap<String, Boolean> validatedTokenCache = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return PUBLIC_PATHS.stream().anyMatch(path::startsWith);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String token = extractToken(request);

        if (token == null) {
            response.setStatus(401);
            response.setContentType("application/json");
            response.getWriter().write("{\"success\":false,\"message\":\"Missing or invalid Authorization header\"}");
            return;
        }

        if (jwtUtil.isTokenBlacklisted(token)) {
            log.warn("Blacklisted token used from IP: {}", request.getRemoteAddr());
            response.setStatus(401);
            response.setContentType("application/json");
            response.getWriter().write("{\"success\":false,\"message\":\"Token has been revoked\"}");
            return;
        }

        if (validatedTokenCache.containsKey(token)) {
            if (!validatedTokenCache.get(token)) {
                response.setStatus(401);
                response.setContentType("application/json");
                response.getWriter().write("{\"success\":false,\"message\":\"Invalid or expired token\"}");
                return;
            }
        } else {
            if (!jwtUtil.validateToken(token)) {
                validatedTokenCache.put(token, false);
                log.warn("Invalid token attempt from IP: {}, UA: {}", request.getRemoteAddr(), request.getHeader("User-Agent"));
                response.setStatus(401);
                response.setContentType("application/json");
                response.getWriter().write("{\"success\":false,\"message\":\"Invalid or expired token\"}");
                return;
            }
            validatedTokenCache.put(token, true);
        }

        String role = jwtUtil.getRoleFromToken(token);
        Long userId = jwtUtil.getUserIdFromToken(token);
        String email = jwtUtil.getEmailFromToken(token);

        response.setHeader("X-Token-Expiry", String.valueOf(jwtUtil.getExpirationFromToken(token)));

        var auth = new UsernamePasswordAuthenticationToken(userId, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase())));
        auth.setDetails(token);
        SecurityContextHolder.getContext().setAuthentication(auth);
        chain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        if (request.getCookies() != null) {
            return Arrays.stream(request.getCookies())
                    .filter(c -> "token".equals(c.getName()))
                    .map(Cookie::getValue)
                    .findFirst()
                    .orElse(null);
        }
        String paramToken = request.getParameter("token");
        if (paramToken != null && !paramToken.isBlank()) {
            return paramToken;
        }
        return null;
    }
}
