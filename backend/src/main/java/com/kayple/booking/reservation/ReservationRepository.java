package com.kayple.booking.reservation;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {
	boolean existsByActiveSlot(String activeSlot);
	Optional<Reservation> findByActivePhone(String activePhone);
	List<Reservation> findBySlotDateBetweenAndStatusIn(LocalDate from, LocalDate to, Collection<ReservationStatus> statuses);
	List<Reservation> findByPhoneOrderBySlotDateDescSlotHourDesc(String phone);
	List<Reservation> findBySlotDateBetweenOrderBySlotDateAscSlotHourAscIdAsc(LocalDate from, LocalDate to);

	/** 시간이 지난 예약은 "진행 중" 표시(activePhone)를 풀어 같은 연락처로 새 예약을 받을 수 있게 한다. */
	@Transactional
	@Modifying(clearAutomatically = true)
	@Query("update Reservation r set r.activePhone = null where r.activePhone = :phone "
			+ "and (r.slotDate < :today or (r.slotDate = :today and r.slotHour <= :hour))")
	int releasePastActivePhone(@Param("phone") String phone, @Param("today") LocalDate today, @Param("hour") int hour);
}
