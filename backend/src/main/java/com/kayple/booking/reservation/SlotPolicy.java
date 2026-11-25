package com.kayple.booking.reservation;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.IntStream;

/** 예약 가능한 날짜·시간 규칙. 오늘부터 7일, 10·11·13~17시 (12시는 점심). */
public final class SlotPolicy {
	public static final List<Integer> HOURS = List.of(10, 11, 13, 14, 15, 16, 17);
	public static final int DAYS = 7;

	private SlotPolicy() {}

	public static List<LocalDate> bookableDates(LocalDate today) {
		return IntStream.range(0, DAYS).mapToObj(today::plusDays).toList();
	}

	public static boolean isValidHour(int hour) {
		return HOURS.contains(hour);
	}

	public static boolean isInRange(LocalDate date, LocalDate today) {
		return !date.isBefore(today) && date.isBefore(today.plusDays(DAYS));
	}

	/** 시작 시각이 지난 슬롯(진행 중 포함)은 예약·취소할 수 없다. */
	public static boolean isPast(LocalDate date, int hour, LocalDateTime now) {
		return !date.atTime(hour, 0).isAfter(now);
	}
}
