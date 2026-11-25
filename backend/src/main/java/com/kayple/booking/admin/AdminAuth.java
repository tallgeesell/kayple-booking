package com.kayple.booking.admin;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** 단일 관리자 계정. 비밀번호는 환경변수(ADMIN_PASSWORD)로만 주입되며, 비어 있으면 로그인 자체를 막는다. */
@Component
public class AdminAuth {
	public static final String SESSION_KEY = "ADMIN";

	private final String username;
	private final String password;

	public AdminAuth(@Value("${admin.username}") String username, @Value("${admin.password:}") String password) {
		this.username = username;
		this.password = password;
	}

	public boolean matches(String user, String pass) {
		if (password == null || password.isBlank() || user == null || pass == null) return false;
		boolean u = MessageDigest.isEqual(user.getBytes(StandardCharsets.UTF_8), username.getBytes(StandardCharsets.UTF_8));
		boolean p = MessageDigest.isEqual(pass.getBytes(StandardCharsets.UTF_8), password.getBytes(StandardCharsets.UTF_8));
		return u & p;
	}
}
