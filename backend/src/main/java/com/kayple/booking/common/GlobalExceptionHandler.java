package com.kayple.booking.common;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(ApiException.class)
	ResponseEntity<Map<String, String>> api(ApiException e) {
		return ResponseEntity.status(e.getStatus()).body(Map.of("code", e.getCode(), "message", e.getMessage()));
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ResponseEntity<Map<String, String>> invalid(MethodArgumentNotValidException e) {
		var err = e.getBindingResult().getFieldErrors().stream().findFirst();
		String field = err.map(f -> f.getField()).orElse("");
		String msg = err.map(f -> f.getDefaultMessage()).orElse("입력값이 올바르지 않습니다");
		return ResponseEntity.badRequest().body(Map.of("code", "INVALID_INPUT", "field", field, "message", msg));
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	ResponseEntity<Map<String, String>> unreadable() {
		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("code", "INVALID_INPUT", "message", "요청 형식이 올바르지 않습니다"));
	}
}
