package com.kayple.booking.reservation;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "reservation",
		indexes = {@Index(name = "idx_reservation_phone", columnList = "phone"),
				@Index(name = "idx_reservation_date", columnList = "slotDate")},
		uniqueConstraints = {
				// 중복 예약 방지의 최종 방어선. 진행 중인 예약만 "날짜-시간" 값을 갖고, 취소되면 NULL.
				// MySQL 유니크 인덱스는 NULL 중복을 허용하므로 취소된 시간은 다시 예약할 수 있다.
				@UniqueConstraint(name = "uk_reservation_active_slot", columnNames = "activeSlot"),
				// 1인 1건 제한. 진행 중인 예약만 연락처 값을 갖고, 취소되거나 시간이 지나면 NULL.
				@UniqueConstraint(name = "uk_reservation_active_phone", columnNames = "activePhone")})
public class Reservation {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 50)
	private String name;

	@Column(nullable = false, length = 20)
	private String phone;

	@Column(nullable = false)
	private LocalDate slotDate;

	@Column(nullable = false)
	private int slotHour;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private ReservationStatus status;

	@Column(length = 20)
	private String activeSlot;

	@Column(length = 20)
	private String activePhone;

	@Column(nullable = false)
	private LocalDateTime createdAt;

	private LocalDateTime cancelledAt;

	/** USER | ADMIN */
	@Column(length = 10)
	private String cancelledBy;

	@Column(length = 200)
	private String cancelReason;

	protected Reservation() {}

	public Reservation(String name, String phone, LocalDate slotDate, int slotHour, LocalDateTime createdAt) {
		this.name = name;
		this.phone = phone;
		this.slotDate = slotDate;
		this.slotHour = slotHour;
		this.status = ReservationStatus.PENDING;
		this.activeSlot = slotKey(slotDate, slotHour);
		this.activePhone = phone;
		this.createdAt = createdAt;
	}

	public static String slotKey(LocalDate date, int hour) {
		return date + "-" + hour;
	}

	public boolean isPast(LocalDateTime now) {
		return SlotPolicy.isPast(slotDate, slotHour, now);
	}

	public void approve() {
		this.status = ReservationStatus.CONFIRMED;
	}

	public void cancel(LocalDateTime now, String by, String reason) {
		this.status = ReservationStatus.CANCELLED;
		this.activeSlot = null;
		this.activePhone = null;
		this.cancelledAt = now;
		this.cancelledBy = by;
		this.cancelReason = reason;
	}

	public Long getId() { return id; }
	public String getName() { return name; }
	public String getPhone() { return phone; }
	public LocalDate getSlotDate() { return slotDate; }
	public int getSlotHour() { return slotHour; }
	public ReservationStatus getStatus() { return status; }
	public LocalDateTime getCreatedAt() { return createdAt; }
	public String getCancelledBy() { return cancelledBy; }
	public String getCancelReason() { return cancelReason; }
}
