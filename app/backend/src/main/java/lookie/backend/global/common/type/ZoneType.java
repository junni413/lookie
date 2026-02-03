package lookie.backend.global.common.type;

import java.util.Arrays;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ZoneType {
    ZONE_A(1L, "ZONE A"),
    ZONE_B(2L, "ZONE B"),
    ZONE_C(3L, "ZONE C"),
    ZONE_D(4L, "ZONE D");

    private final Long id;
    private final String name;

    public static String getNameById(Long id) {
        if (id == null) {
            return "UNKNOWN";
        }
        return Arrays.stream(values())
                .filter(type -> type.id.equals(id))
                .findFirst()
                .map(ZoneType::getName)
                .orElse("UNKNOWN");
    }
}
