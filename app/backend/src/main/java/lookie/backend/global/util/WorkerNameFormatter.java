package lookie.backend.global.util;

/**
 * 작업자 이름 포맷팅 유틸리티 클래스
 */
public class WorkerNameFormatter {

    /**
     * 작업자 이름과 전화번호를 조합하여 포맷팅된 이름을 반환합니다.
     * 형식: "이름 + 전화번호 뒷 4자리" (예: "홍길동 1234")
     *
     * @param name        작업자 이름
     * @param phoneNumber 작업자 전화번호
     * @return 포맷팅된 이름 (입력값이 유효하지 않은 경우 원래 이름 반환)
     */
    public static String format(String name, String phoneNumber) {
        if (name != null && phoneNumber != null && phoneNumber.length() >= 4) {
            String last4Digits = phoneNumber.substring(phoneNumber.length() - 4);
            return name + " " + last4Digits;
        }
        return name;
    }
}
