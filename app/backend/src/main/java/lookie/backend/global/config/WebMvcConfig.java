package lookie.backend.global.config;

import lombok.RequiredArgsConstructor;
import lookie.backend.global.upload.UploadProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 로컬 개발 환경에서 정적 이미지 서빙을 위한 설정
 * - 배포 환경(Docker)에서는 Nginx가 이미지를 서빙하므로 이 설정이 사용되지 않거나 Nginx가 우선 처리함
 * - 로컬(IDE)에서는 Nginx가 없으므로 Spring이 직접 /images/** 요청을 파일 시스템으로 매핑해야 함
 */
@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final UploadProperties uploadProperties;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String uploadDir = uploadProperties.getUploadDir();

        // OS 호환성을 위해 Path API 사용 (file:/// 하드코딩 제거)
        String resourcePath = java.nio.file.Paths.get(uploadDir).toAbsolutePath().toUri().toString();

        registry.addResourceHandler("/images/**")
                .addResourceLocations(resourcePath);
    }
}
