package lookie.backend.domain.task.exception;

public class ItemNotFoundException extends RuntimeException {
    public ItemNotFoundException() {
        super("해당 위치에서 집품할 아이템이 아니거나 이미 완료되었습니다.");
    }
}
