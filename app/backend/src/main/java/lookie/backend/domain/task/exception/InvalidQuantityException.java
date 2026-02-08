package lookie.backend.domain.task.exception;

public class InvalidQuantityException extends RuntimeException {
    public InvalidQuantityException() {
        super("Invalid quantity");
    }

    public InvalidQuantityException(String message) {
        super(message);
    }
}
