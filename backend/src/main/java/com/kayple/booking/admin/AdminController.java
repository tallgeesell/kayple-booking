package com.kayple.booking.admin;

import com.kayple.booking.common.ApiException;
import com.kayple.booking.reservation.ReservationDtos.AdminCancelRequest;
import com.kayple.booking.reservation.ReservationDtos.ReservationView;
import jakarta.validation.Valid;
import java.time.YearMonth;
import com.kayple.booking.reservation.ReservationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
	private final AdminAuth auth;
	private final ReservationService service;

	public AdminController(AdminAuth auth, ReservationService service) {
		this.auth = auth;
		this.service = service;
	}

	public record LoginRequest(String username, String password) {}

	@PostMapping("/login")
	public Map<String, Object> login(@RequestBody LoginRequest req, HttpServletRequest http) {
		if (!auth.matches(req.username(), req.password()))
			throw new ApiException(HttpStatus.UNAUTHORIZED, "LOGIN_FAILED", "아이디 또는 비밀번호가 올바르지 않습니다");
		HttpSession session = http.getSession(true);
		http.changeSessionId(); // 세션 고정 공격 방지
		session.setAttribute(AdminAuth.SESSION_KEY, true);
		return Map.of("ok", true);
	}

	@GetMapping("/me")
	public Map<String, Object> me() {
		return Map.of("ok", true);
	}

	@PostMapping("/logout")
	public Map<String, Object> logout(HttpServletRequest http) {
		HttpSession s = http.getSession(false);
		if (s != null) s.invalidate();
		return Map.of("ok", true);
	}

	@GetMapping("/reservations")
	public List<ReservationView> reservations(@RequestParam int year, @RequestParam int month) {
		if (month < 1 || month > 12 || year < 2000 || year > 2100)
			throw ApiException.badRequest("INVALID_MONTH", "조회할 수 없는 기간입니다");
		return service.findByMonth(YearMonth.of(year, month));
	}

	@PostMapping("/reservations/{id}/approve")
	public ReservationView approve(@PathVariable long id) {
		return service.approve(id);
	}

	@PostMapping("/reservations/{id}/cancel")
	public ReservationView cancel(@PathVariable long id, @Valid @RequestBody AdminCancelRequest req) {
		return service.cancelByAdmin(id, req.reason());
	}
}
