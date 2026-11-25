package com.kayple.booking.reservation;

import java.util.regex.Pattern;

/** 연락처는 하이픈 유무와 관계없이 받고, 010-1234-5678 형태로 정규화해 저장·조회한다. */
public final class PhoneNumbers {
	private static final Pattern MOBILE = Pattern.compile("^01[016789]\\d{7,8}$");

	private PhoneNumbers() {}

	/** @return 정규화된 번호, 형식이 틀리면 null */
	public static String normalize(String raw) {
		if (raw == null) return null;
		String digits = raw.replaceAll("[\\s-]", "");
		if (!MOBILE.matcher(digits).matches()) return null;
		int mid = digits.length() == 11 ? 7 : 6;
		return digits.substring(0, 3) + "-" + digits.substring(3, mid) + "-" + digits.substring(mid);
	}

	public static String mask(String normalized) {
		String[] p = normalized.split("-");
		return p[0] + "-" + "*".repeat(p[1].length()) + "-" + p[2];
	}
}
