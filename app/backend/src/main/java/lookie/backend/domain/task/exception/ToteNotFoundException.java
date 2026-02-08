package lookie.backend.domain.task.exception;

public class ToteNotFoundException extends RuntimeException {
    public ToteNotFoundException() {
        super("Tote not found");
    }

    public ToteNotFoundException(String message) {
        super(message);
    }
}
