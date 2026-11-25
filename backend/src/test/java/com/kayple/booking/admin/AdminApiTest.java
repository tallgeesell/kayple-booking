package com.kayple.booking.admin;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.kayple.booking.FixedClockConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest
@Import(FixedClockConfig.class)
class AdminApiTest {
	@Autowired WebApplicationContext context;
	MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.webAppContextSetup(context).build();
	}

	@Test
	void 로그인하지_않으면_관리자_API는_401() throws Exception {
		mvc.perform(get("/api/admin/reservations").param("year", "2026").param("month", "11")).andExpect(status().isUnauthorized());
	}

	@Test
	void 로그인하지_않으면_승인_취소도_401() throws Exception {
		mvc.perform(post("/api/admin/reservations/1/approve")).andExpect(status().isUnauthorized());
		mvc.perform(post("/api/admin/reservations/1/cancel").contentType(MediaType.APPLICATION_JSON)
				.content("{\"reason\":\"x\"}")).andExpect(status().isUnauthorized());
	}

	@Test
	void 비밀번호가_틀리면_401() throws Exception {
		mvc.perform(post("/api/admin/login").contentType(MediaType.APPLICATION_JSON)
				.content("{\"username\":\"admin\",\"password\":\"wrong\"}"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.code").value("LOGIN_FAILED"));
	}

	@Test
	void 로그인하면_날짜별_예약을_조회할_수_있고_로그아웃하면_다시_막힌다() throws Exception {
		MockHttpSession session = new MockHttpSession();
		mvc.perform(post("/api/admin/login").session(session).contentType(MediaType.APPLICATION_JSON)
				.content("{\"username\":\"admin\",\"password\":\"test-password\"}"))
				.andExpect(status().isOk());
		mvc.perform(get("/api/admin/reservations").session(session).param("year", "2026").param("month", "11"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isArray());
		mvc.perform(post("/api/admin/logout").session(session)).andExpect(status().isOk());
		mvc.perform(get("/api/admin/reservations").session(session).param("year", "2026").param("month", "11"))
				.andExpect(status().isUnauthorized());
	}
}
