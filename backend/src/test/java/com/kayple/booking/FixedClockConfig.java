package com.kayple.booking;

import java.time.Clock;
import java.time.LocalDateTime;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/** 테스트 기준 시각: 2026-11-25(수) 09:00 KST */
@TestConfiguration
public class FixedClockConfig {
	public static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 25, 9, 0);

	@Bean
	@Primary
	Clock fixedClock() {
		return Clock.fixed(NOW.atZone(BackendApplication.ZONE).toInstant(), BackendApplication.ZONE);
	}
}
