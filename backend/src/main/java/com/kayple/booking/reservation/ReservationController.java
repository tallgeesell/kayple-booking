package com.kayple.booking.reservation;

import com.kayple.booking.reservation.ReservationDtos.*;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ReservationController {
	private final ReservationService service;

	public ReservationController(ReservationService service) {
		this.service = service;
	}

	@GetMapping("/slots")
	public List<DayView> slots() {
		return service.availability();
	}

	@PostMapping("/reservations")
	@ResponseStatus(HttpStatus.CREATED)
	public ReservationView create(@Valid @RequestBody CreateRequest req) {
		return service.create(req);
	}

	/** 연락처가 URL·로그에 남지 않도록 조회도 POST 본문으로 받는다. */
	@PostMapping("/reservations/lookup")
	public List<ReservationView> lookup(@Valid @RequestBody PhoneRequest req) {
		return service.findByPhone(req.phone());
	}

	@PostMapping("/reservations/{id}/cancel")
	public ReservationView cancel(@PathVariable long id, @Valid @RequestBody PhoneRequest req) {
		return service.cancelByUser(id, req.phone());
	}
}
