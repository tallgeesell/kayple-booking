package com.kayple.booking.reservation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

public final class ReservationDtos {
	private ReservationDtos() {}

	static final DateTimeFormatter CREATED_FMT = DateTimeFormatter.ofPattern("yyyy.MM.dd HH:mm");

	/** viewedToday: 화면을 연 시점의 "오늘". 자정이 지난 뒤 제출하면 서버가 DATE_CHANGED로 거절한다. */
	public record CreateRequest(
			@NotNull(message = "날짜를 선택해 주세요") LocalDate date,
			@NotNull(message = "시간을 선택해 주세요") Integer hour,
			@NotBlank(message = "이름을 입력해 주세요") @Size(max = 20, message = "이름은 20자 이내로 입력해 주세요") String name,
			@NotBlank(message = "연락처를 입력해 주세요") String phone,
			LocalDate viewedToday) {}

	public record PhoneRequest(@NotBlank(message = "연락처를 입력해 주세요") String phone) {}

	public record AdminCancelRequest(
			@NotBlank(message = "취소 사유를 입력해 주세요") @Size(max = 200, message = "취소 사유는 200자 이내로 입력해 주세요") String reason) {}

	/** status: AVAILABLE | BOOKED(마감) | PAST(지난 시간, 비활성) */
	public record SlotView(int hour, String status) {}

	public record DayView(String date, List<SlotView> slots) {}

	public record ReservationView(long id, String date, int hour, String name, String phoneMasked, String status,
			String createdAt, boolean past, String cancelledBy, String cancelReason) {
		static ReservationView of(Reservation r, LocalDateTime now) {
			return new ReservationView(r.getId(), r.getSlotDate().toString(), r.getSlotHour(), r.getName(),
					PhoneNumbers.mask(r.getPhone()), r.getStatus().name(), r.getCreatedAt().format(CREATED_FMT),
					r.isPast(now), r.getCancelledBy(), r.getCancelReason());
		}
	}
}
