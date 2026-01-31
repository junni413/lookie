package lookie.backend.domain.task.exception;

public class ItemQuantityExceededException extends RuntimeException {
    public ItemQuantityExceededException() {
        super("요구 수량을 초과하여 집품할 수 없습니다.");
    }
}
