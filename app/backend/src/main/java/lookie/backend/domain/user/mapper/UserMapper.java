package lookie.backend.domain.user.mapper;

import lookie.backend.domain.user.vo.UserVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface UserMapper {

    // 1. 회원가입: 성공 시 생성된 PK가 userVO의 userId에 채워짐
    void insertUser(UserVO userVO);

    // 2. 로그인 및 정보 조회용
    Optional<UserVO> findByPhoneNumber(String phoneNumber);

    // 2-1. 로그인 시 삭제된 계정 구분용 (is_active 필터링 없이 조회)
    Optional<UserVO> findByPhoneNumberIncludingDeleted(String phoneNumber);

    // 3. 전화번호 (아이디) 중복 확인용
    boolean existByPhoneNumber(String phoneNumber);

    // 4. 이메일 중복 확인용
    boolean existByEmail(String email);

    // 5. 사용자 ID로 조회 (토큰 재발급 시 Role 정보 필요)
    Optional<UserVO> findById(Long userId);

    // 6. 이메일로 사용자 조회 (비밀번호 재설정용)
    UserVO findByEmail(String email);

    // 7. 비밀번호 업데이트 (비밀번호 재설정용)
    void updatePassword(java.util.Map<String, Object> params);

    // 8. 프로필 업데이트 (이름, 이메일, 비밀번호 선택적 수정)
    void updateUserProfile(java.util.Map<String, Object> params);

    // 9. 회원 탈퇴 (Soft Delete)
    void softDeleteUser(java.util.Map<String, Object> params);

    // 10. 구역별 관리자 조회 (WebRTC 자동 배정용)
    /**
     * 특정 구역의 관리자(ADMIN) 목록 조회
     * 
     * @param zoneId 구역 ID
     * @return 활성 상태의 관리자 목록
     */
    List<UserVO> findAdminsByZone(@Param("zoneId") Long zoneId);

}
