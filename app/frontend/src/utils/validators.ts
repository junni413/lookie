// src/utils/validators.ts

export const isValidEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// ✅ 백 규칙 반영 (7~15, 영문+숫자 필수)
export const PASSWORD_REGEX =
  /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{7,15}$/;

export const isValidPassword = (v: string) =>
  PASSWORD_REGEX.test(v);

export const onlyDigits = (v: string) => v.replace(/\D/g, "");
