package lookie.backend.domain.task.exception;

public class ItemMismatchException extends RuntimeException {
    public ItemMismatchException() {
        super("Item mismatch");
    }

    public ItemMismatchException(String message) {
        super(message);
    }
}
