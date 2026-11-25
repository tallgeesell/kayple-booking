package com.kayple.booking.reservation;

import static org.assertj.core.api.Assertions.*;

import com.kayple.booking.FixedClockConfig;
import com.kayple.booking.common.ApiException;
import com.kayple.booking.reservation.ReservationDtos.*;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;

@SpringBootTest
@Import(FixedClockConfig.class)
class ReservationServiceTest {
	static final LocalDate TODAY = FixedClockConfig.NOW.toLocalDate(); // 2026-11-25 09:00
	static final LocalDate TOMORROW = TODAY.plusDays(1);

	@Autowired ReservationService service;
	@Autowired ReservationRepository repository;

	@BeforeEach
	void clean() {
		repository.deleteAll();
	}

	private CreateRequest req(LocalDate date, int hour, String phone) {
		return new CreateRequest(date, hour, "홍길동", phone, TODAY);
	}

	private void assertApiError(Runnable r, HttpStatus status, String code) {
		assertThatThrownBy(r::run).isInstanceOfSatisfying(ApiException.class, e -> {
			assertThat(e.getStatus()).isEqualTo(status);
			assertThat(e.getCode()).isEqualTo(code);
		});
	}

	// ---- 같은 시간 중복 예약 ----

	@Test
	void 같은_시간에_두번_예약하면_두번째는_409() {
		service.create(req(TOMORROW, 14, "010-1234-5678"));
		assertApiError(() -> service.create(req(TOMORROW, 14, "010-9999-8888")), HttpStatus.CONFLICT, "SLOT_TAKEN");
	}

	@Test
	void 동시에_같은_시간을_예약해도_하나만_성공한다() throws Exception {
		int n = 10;
		ExecutorService pool = Executors.newFixedThreadPool(n);
		CountDownLatch start = new CountDownLatch(1);
		List<Future<Boolean>> results = new ArrayList<>();
		for (int i = 0; i < n; i++) {
			String phone = String.format("010-1000-%04d", i);
			results.add(pool.submit(() -> {
				start.await();
				try {
					service.create(req(TOMORROW, 10, phone));
					return true;
				} catch (ApiException e) {
					assertThat(e.getCode()).isEqualTo("SLOT_TAKEN");
					return false;
				}
			}));
		}
		start.countDown();
		int success = 0;
		for (Future<Boolean> f : results) if (f.get(10, TimeUnit.SECONDS)) success++;
		pool.shutdown();

		assertThat(success).isEqualTo(1);
		assertThat(repository.count()).isEqualTo(1);
	}

	@Test
	void 취소된_시간은_다시_예약할_수_있다() {
		ReservationView v = service.create(req(TOMORROW, 13, "010-1234-5678"));
		service.cancelByUser(v.id(), "010-1234-5678");
		assertThat(service.create(req(TOMORROW, 13, "010-2222-3333")).status()).isEqualTo("PENDING");
	}

	// ---- 1인 1건 ----

	@Test
	void 진행중인_예약이_있으면_다른_시간도_신청할_수_없다() {
		service.create(req(TOMORROW, 10, "010-1234-5678"));
		assertApiError(() -> service.create(req(TOMORROW.plusDays(1), 15, "01012345678")), HttpStatus.CONFLICT, "ALREADY_HAS_RESERVATION");
	}

	@Test
	void 동시에_같은_사람이_여러_시간을_신청해도_하나만_성공한다() throws Exception {
		List<Integer> hours = SlotPolicy.HOURS;
		ExecutorService pool = Executors.newFixedThreadPool(hours.size());
		CountDownLatch start = new CountDownLatch(1);
		List<Future<Boolean>> results = new ArrayList<>();
		for (int h : hours) {
			results.add(pool.submit(() -> {
				start.await();
				try {
					service.create(req(TOMORROW, h, "010-1234-5678"));
					return true;
				} catch (ApiException e) {
					assertThat(e.getCode()).isEqualTo("ALREADY_HAS_RESERVATION");
					return false;
				}
			}));
		}
		start.countDown();
		int success = 0;
		for (Future<Boolean> f : results) if (f.get(10, TimeUnit.SECONDS)) success++;
		pool.shutdown();
		assertThat(success).isEqualTo(1);
	}

	@Test
	void 취소했거나_이미_지난_예약만_있으면_새로_신청할_수_있다() {
		ReservationView v = service.create(req(TOMORROW, 10, "010-1234-5678"));
		service.cancelByUser(v.id(), "010-1234-5678");
		service.create(req(TOMORROW, 11, "010-1234-5678")); // 취소 후 재신청 가능

		repository.deleteAll();
		repository.saveAndFlush(new Reservation("홍길동", "010-1234-5678", TODAY.minusDays(1), 10, FixedClockConfig.NOW.minusDays(2)));
		assertThat(service.create(req(TOMORROW, 11, "010-1234-5678")).status()).isEqualTo("PENDING");
	}

	// ---- 날짜·시간 검증 ----

	@Test
	void 화면을_연_뒤_자정이_지나_제출하면_DATE_CHANGED() {
		CreateRequest stale = new CreateRequest(TOMORROW, 10, "홍길동", "010-1234-5678", TODAY.minusDays(1));
		assertApiError(() -> service.create(stale), HttpStatus.CONFLICT, "DATE_CHANGED");
	}

	@Test
	void 예약_불가능한_날짜와_시간은_거절한다() {
		assertApiError(() -> service.create(req(TOMORROW, 12, "010-1234-5678")), HttpStatus.BAD_REQUEST, "INVALID_SLOT");
		assertApiError(() -> service.create(req(TOMORROW, 18, "010-1234-5678")), HttpStatus.BAD_REQUEST, "INVALID_SLOT");
		assertApiError(() -> service.create(req(TODAY.plusDays(7), 10, "010-1234-5678")), HttpStatus.BAD_REQUEST, "INVALID_SLOT");
		assertApiError(() -> service.create(req(TODAY.minusDays(1), 10, "010-1234-5678")), HttpStatus.BAD_REQUEST, "INVALID_SLOT");
	}

	@Test
	void 연락처_형식이_틀리면_거절한다() {
		assertApiError(() -> service.create(req(TOMORROW, 10, "010-1234")), HttpStatus.BAD_REQUEST, "INVALID_PHONE");
		assertApiError(() -> service.create(req(TOMORROW, 10, "02-123-4567")), HttpStatus.BAD_REQUEST, "INVALID_PHONE");
	}

	@Test
	void 가용_슬롯은_7일치이고_예약된_시간은_BOOKED_지난_시간은_PAST() {
		service.create(req(TOMORROW, 11, "010-1234-5678"));
		List<DayView> days = service.availability();
		assertThat(days).hasSize(7);
		assertThat(days.get(0).date()).isEqualTo(TODAY.toString());
		assertThat(days.get(0).slots()).extracting(SlotView::hour).containsExactly(10, 11, 13, 14, 15, 16, 17);
		assertThat(days.get(1).slots()).filteredOn(s -> s.hour() == 11).extracting(SlotView::status).containsOnly("BOOKED");
		assertThat(days.get(1).slots()).filteredOn(s -> s.hour() != 11).extracting(SlotView::status).containsOnly("AVAILABLE");
		assertThat(SlotPolicy.isPast(TODAY, 10, TODAY.atTime(10, 0))).isTrue();
	}

	// ---- 조회·취소·승인 ----

	@Test
	void 조회_결과의_연락처는_마스킹된다() {
		service.create(req(TOMORROW, 10, "01012345678"));
		List<ReservationView> list = service.findByPhone("010-1234-5678");
		assertThat(list).hasSize(1);
		assertThat(list.get(0).phoneMasked()).isEqualTo("010-****-5678");
		assertThat(service.findByPhone("010-5555-5555")).isEmpty();
	}

	@Test
	void 다른_연락처로는_취소할_수_없다() {
		ReservationView v = service.create(req(TOMORROW, 13, "010-1234-5678"));
		assertApiError(() -> service.cancelByUser(v.id(), "010-0000-0000"), HttpStatus.NOT_FOUND, "NOT_FOUND");
	}

	@Test
	void 이미_지난_예약은_취소할_수_없다() {
		Reservation past = repository.saveAndFlush(new Reservation("홍길동", "010-1234-5678", TODAY.minusDays(1), 10, FixedClockConfig.NOW.minusDays(2)));
		assertApiError(() -> service.cancelByUser(past.getId(), "010-1234-5678"), HttpStatus.BAD_REQUEST, "PAST_RESERVATION");
		assertThat(service.findByPhone("010-1234-5678").get(0).past()).isTrue();
	}

	@Test
	void 관리자가_승인하고_사유와_함께_취소하면_사용자_조회에_사유가_보인다() {
		ReservationView v = service.create(req(TOMORROW, 13, "010-1234-5678"));
		assertThat(service.approve(v.id()).status()).isEqualTo("CONFIRMED");
		assertApiError(() -> service.approve(v.id()), HttpStatus.CONFLICT, "NOT_PENDING");

		service.cancelByAdmin(v.id(), "  상담사 일정 변경  ");
		ReservationView seen = service.findByPhone("010-1234-5678").get(0);
		assertThat(seen.status()).isEqualTo("CANCELLED");
		assertThat(seen.cancelledBy()).isEqualTo("ADMIN");
		assertThat(seen.cancelReason()).isEqualTo("상담사 일정 변경");
		assertThat(service.findByMonth(YearMonth.from(TOMORROW))).hasSize(1);
	}
}
