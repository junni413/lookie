package lookie.backend.global.common.type;

import java.util.Arrays;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum LineType {
    A_101(1L, "A-101"), A_102(2L, "A-102"), A_103(3L, "A-103"),
    B_101(4L, "B-101"), B_102(5L, "B-102"), B_103(6L, "B-103"),
    C_101(7L, "C-101"), C_102(8L, "C-102"), C_103(9L, "C-103"),
    D_101(10L, "D-101"), D_102(11L, "D-102"), D_103(12L, "D-103");

    private final Long id;
    private final String name;

    public static String getNameById(Long id) {
        if (id == null) {
            return "UNKNOWN";
        }
        return Arrays.stream(values())
                .filter(type -> type.id.equals(id))
                .findFirst()
                .map(LineType::getName)
                .orElse("UNKNOWN");
    }
}
