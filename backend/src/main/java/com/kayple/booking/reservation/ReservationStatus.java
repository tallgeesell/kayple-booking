package com.kayple.booking.reservation;

/** PENDING(대기) → CONFIRMED(승인) / CANCELLED(취소). 대기·승인 모두 해당 시간을 점유한다. */
public enum ReservationStatus { PENDING, CONFIRMED, CANCELLED }
