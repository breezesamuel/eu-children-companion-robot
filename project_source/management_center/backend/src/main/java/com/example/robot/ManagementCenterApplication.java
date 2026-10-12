package com.example.robot;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.client.RestTemplate;

import java.util.TimeZone;
import java.util.concurrent.Executor;

@SpringBootApplication
@EnableScheduling
@EnableAsync
public class ManagementCenterApplication {

    public static void main(String[] args) {
        SpringApplication.run(ManagementCenterApplication.class, args);
    }

    @Bean
    public CommandLineRunner startupRunner() {
        return args -> {
            TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
            System.out.println("=== Management Center Application Started ===");
        };
    }

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.setTimeZone(TimeZone.getTimeZone("UTC"));
        return mapper;
    }

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    @Bean
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("robot-async-");
        executor.initialize();
        return executor;
    }
}
