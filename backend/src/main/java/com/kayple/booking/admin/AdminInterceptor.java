package com.kayple.booking.admin;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.nio.charset.StandardCharsets;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/** /api/admin/** (로그인 제외) 은 세션에 관리자 표시가 없으면 401로 끊는다. */
@Component
public class AdminInterceptor implements HandlerInterceptor {
	@Override
	public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) throws Exception {
		HttpSession session = req.getSession(false);
		if (session != null && Boolean.TRUE.equals(session.getAttribute(AdminAuth.SESSION_KEY))) return true;
		res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
		res.setContentType("application/json");
		res.setCharacterEncoding(StandardCharsets.UTF_8.name());
		res.getWriter().write("{\"code\":\"UNAUTHORIZED\",\"message\":\"로그인이 필요합니다\"}");
		return false;
	}
}
