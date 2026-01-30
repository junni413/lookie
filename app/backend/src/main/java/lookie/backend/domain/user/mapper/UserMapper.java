package lookie.backend.domain.user.mapper;

import lookie.backend.domain.user.vo.UserVO;
import org.apache.ibatis.annotations.Mapper;

import java.util.Optional;

@Mapper
public interface UserMapper {

    // 1. 회원가입: 성공 시 생성된 PK가 userVO의 userId에 채워짐
    void insertUser(UserVO userVO);

    // 2. 로그인 및 정보 조회용
    Optional<UserVO> findByPhoneNumber(String phoneNumber);

    // 3. 전화번호 (아이디) 중복 확인용
    boolean existByPhoneNumber(String phoneNumber);

    // 4. 이메일 중복 확인용
    boolean existByEmail(String email);

    // 5. 사용자 ID로 조회 (토큰 재발급 시 Role 정보 필요)
    Optional<UserVO> findById(Long userId);

}
