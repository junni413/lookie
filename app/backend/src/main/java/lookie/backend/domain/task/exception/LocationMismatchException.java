package lookie.backend.domain.task.exception;

public class LocationMismatchException extends RuntimeException {
    public LocationMismatchException() {
        super("Location mismatch");
    }

    public LocationMismatchException(String message) {
        super(message);
    }
}
