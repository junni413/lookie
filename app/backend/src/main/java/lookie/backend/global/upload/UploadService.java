package lookie.backend.global.upload;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UploadService {

    private final UploadProperties uploadProperties;
    private static final List<String> ALLOWED_EXTENSIONS = List.of("jpg", "jpeg", "png");
    private static final List<String> ALLOWED_MIME_TYPES = List.of("image/jpeg", "image/png");

    public String uploadImage(MultipartFile file) {
        if (file.isEmpty()) {
            throw new ApiException(ErrorCode.UPLOAD_FILE_EMPTY);
        }

        String originalFilename = file.getOriginalFilename();
        String extension = getExtension(originalFilename);

        // 1. 확장자 체크
        if (!ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
            throw new ApiException(ErrorCode.UPLOAD_INVALID_EXTENSION);
        }

        // 2. MIME Type 체크 (보안 강화)
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            throw new ApiException(ErrorCode.UPLOAD_INVALID_EXTENSION);
        }

        String storedFileName = UUID.randomUUID() + "." + extension;

        try {
            Path uploadPath = Paths.get(uploadProperties.getUploadDir()).toAbsolutePath().normalize();
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            Path targetLocation = uploadPath.resolve(storedFileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            // Construct Full URL: baseUrl + "/" + storedFileName
            // Ensure baseUrl doesn't have trailing slash
            String baseUrl = uploadProperties.getBaseUrl();
            if (baseUrl.endsWith("/")) {
                baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
            }

            return baseUrl + "/" + storedFileName;

        } catch (IOException e) {
            log.error("File upload failed", e);
            throw new ApiException(ErrorCode.UPLOAD_FAILED);
        }
    }

    private String getExtension(String filename) {
        if (filename == null || filename.lastIndexOf('.') == -1) {
            return "";
        }
        return filename.substring(filename.lastIndexOf('.') + 1);
    }
}
