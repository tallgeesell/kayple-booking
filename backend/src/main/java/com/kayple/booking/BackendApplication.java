package com.kayple.booking;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class BackendApplication {

	public static final ZoneId ZONE = ZoneId.of("Asia/Seoul");

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

	/** 서버 시간대와 무관하게 한국 시간 기준으로 "오늘"을 계산한다. 테스트에서 고정 시각으로 교체한다. */
	@Bean
	Clock clock() {
		return Clock.system(ZONE);
	}
}
