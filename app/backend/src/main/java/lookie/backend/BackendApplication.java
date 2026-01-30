package lookie.backend;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BackendApplication {

    public static void main(String[] args) {
        // .env 파일 로드 (IDE 플러그인 불필요)
        // 로컬 개발 환경에서만 사용, 프로덕션에서는 시스템 환경 변수 사용
        try {
            Dotenv dotenv = Dotenv.configure()
                    .directory("./") // 프로젝트 루트의 .env 파일
                    .ignoreIfMissing() // .env 파일이 없어도 애플리케이션 실행 가능
                    .load();

            // .env 파일의 모든 변수를 시스템 프로퍼티에 주입
            dotenv.entries().forEach(entry -> {
                System.setProperty(entry.getKey(), entry.getValue());
            });

            System.out.println("[.env] 환경 변수 로드 완료");
        } catch (Exception e) {
            // .env 파일 로드 실패 시에도 애플리케이션은 정상 실행
            // (프로덕션 환경에서는 시스템 환경 변수 사용)
            System.out.println("[.env] 환경 변수 로드 실패 (시스템 환경 변수 사용): " + e.getMessage());
        }

        SpringApplication.run(BackendApplication.class, args);
    }

}
