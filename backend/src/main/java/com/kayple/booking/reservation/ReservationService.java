package com.kayple.booking.reservation;

import com.kayple.booking.common.ApiException;
import com.kayple.booking.reservation.ReservationDtos.*;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservationService {
	public static final String SLOT_TAKEN_MESSAGE = "이미 예약된 시간입니다. 다른 시간을 선택해 주세요.";
	public static final String ALREADY_HAS_MESSAGE = "이미 신청한 예약이 있습니다";
	private static final Set<ReservationStatus> ACTIVE = EnumSet.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED);

	private final ReservationRepository repository;
	private final Clock clock;

	public ReservationService(ReservationRepository repository, Clock clock) {
		this.repository = repository;
		this.clock = clock;
	}

	private LocalDateTime now() {
		return LocalDateTime.now(clock);
	}

	@Transactional(readOnly = true)
	public List<DayView> availability() {
		LocalDateTime now = now();
		List<LocalDate> dates = SlotPolicy.bookableDates(now.toLocalDate());
		Set<String> taken = repository
				.findBySlotDateBetweenAndStatusIn(dates.get(0), dates.get(dates.size() - 1), ACTIVE)
				.stream().map(r -> Reservation.slotKey(r.getSlotDate(), r.getSlotHour()))
				.collect(Collectors.toSet());
		return dates.stream().map(d -> new DayView(d.toString(), SlotPolicy.HOURS.stream()
				.map(h -> new SlotView(h, SlotPolicy.isPast(d, h, now) ? "PAST"
						: taken.contains(Reservation.slotKey(d, h)) ? "BOOKED" : "AVAILABLE"))
				.toList())).toList();
	}

	/**
	 * 예약 생성(대기 상태). 사전 확인은 친절한 오류용이고, 동시에 들어온 요청은
	 * DB 유니크 제약(같은 시간: uk_reservation_active_slot, 같은 사람: uk_reservation_active_phone)이 막는다.
	 */
	public ReservationView create(CreateRequest req) {
		String name = req.name().trim();
		if (name.isEmpty()) throw ApiException.badRequest("INVALID_NAME", "이름을 입력해 주세요");
		String phone = PhoneNumbers.normalize(req.phone());
		if (phone == null) throw ApiException.badRequest("INVALID_PHONE", "연락처 형식이 올바르지 않습니다");

		LocalDateTime now = now();
		LocalDate today = now.toLocalDate();
		if (req.viewedToday() != null && !req.viewedToday().equals(today))
			throw new ApiException(HttpStatus.CONFLICT, "DATE_CHANGED", "날짜가 바뀌었습니다. 예약 가능한 일정을 다시 확인해 주세요.");
		if (!SlotPolicy.isValidHour(req.hour()) || !SlotPolicy.isInRange(req.date(), today))
			throw ApiException.badRequest("INVALID_SLOT", "예약할 수 없는 날짜 또는 시간입니다");
		if (SlotPolicy.isPast(req.date(), req.hour(), now))
			throw ApiException.badRequest("PAST_SLOT", "이미 지난 시간은 예약할 수 없습니다");

		repository.releasePastActivePhone(phone, today, now.getHour());
		if (repository.findByActivePhone(phone).isPresent()) throw alreadyHas();
		if (repository.existsByActiveSlot(Reservation.slotKey(req.date(), req.hour()))) throw slotTaken();
		try {
			return ReservationView.of(repository.saveAndFlush(new Reservation(name, phone, req.date(), req.hour(), now)), now);
		} catch (DataIntegrityViolationException e) {
			throw repository.findByActivePhone(phone).isPresent() ? alreadyHas() : slotTaken();
		}
	}

	@Transactional(readOnly = true)
	public List<ReservationView> findByPhone(String rawPhone) {
		String phone = PhoneNumbers.normalize(rawPhone);
		if (phone == null) throw ApiException.badRequest("INVALID_PHONE", "연락처 형식이 올바르지 않습니다");
		LocalDateTime now = now();
		return repository.findByPhoneOrderBySlotDateDescSlotHourDesc(phone).stream().map(r -> ReservationView.of(r, now)).toList();
	}

	/** 사용자 취소. 본인 확인은 예약 시 입력한 연락처 일치 여부로 하고, 불일치 시 존재 여부를 드러내지 않도록 404. */
	@Transactional
	public ReservationView cancelByUser(long id, String rawPhone) {
		String phone = PhoneNumbers.normalize(rawPhone);
		Reservation r = repository.findById(id)
				.filter(x -> phone != null && x.getPhone().equals(phone))
				.orElseThrow(ReservationService::notFound);
		return cancel(r, "USER", null);
	}

	@Transactional
	public ReservationView cancelByAdmin(long id, String reason) {
		return cancel(repository.findById(id).orElseThrow(ReservationService::notFound), "ADMIN", reason.trim());
	}

	@Transactional
	public ReservationView approve(long id) {
		Reservation r = repository.findById(id).orElseThrow(ReservationService::notFound);
		if (r.getStatus() != ReservationStatus.PENDING)
			throw new ApiException(HttpStatus.CONFLICT, "NOT_PENDING", "대기 중인 예약만 승인할 수 있습니다");
		if (r.isPast(now())) throw ApiException.badRequest("PAST_RESERVATION", "이미 지난 예약입니다");
		r.approve();
		return ReservationView.of(r, now());
	}

	private ReservationView cancel(Reservation r, String by, String reason) {
		LocalDateTime now = now();
		if (r.getStatus() == ReservationStatus.CANCELLED)
			throw new ApiException(HttpStatus.CONFLICT, "ALREADY_CANCELLED", "이미 취소된 예약입니다");
		if (r.isPast(now)) throw ApiException.badRequest("PAST_RESERVATION", "이미 지난 예약은 취소할 수 없습니다");
		r.cancel(now, by, reason);
		return ReservationView.of(r, now);
	}

	@Transactional(readOnly = true)
	public List<ReservationView> findByMonth(YearMonth month) {
		LocalDateTime now = now();
		return repository.findBySlotDateBetweenOrderBySlotDateAscSlotHourAscIdAsc(month.atDay(1), month.atEndOfMonth())
				.stream().map(r -> ReservationView.of(r, now)).toList();
	}

	private static ApiException notFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "예약을 찾을 수 없습니다");
	}

	private static ApiException slotTaken() {
		return new ApiException(HttpStatus.CONFLICT, "SLOT_TAKEN", SLOT_TAKEN_MESSAGE);
	}

	private static ApiException alreadyHas() {
		return new ApiException(HttpStatus.CONFLICT, "ALREADY_HAS_RESERVATION", ALREADY_HAS_MESSAGE);
	}
}
