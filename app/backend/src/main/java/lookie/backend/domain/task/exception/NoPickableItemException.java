package lookie.backend.domain.task.exception;

public class NoPickableItemException extends RuntimeException {
    public NoPickableItemException() {
        super("No pickable item found");
    }

    public NoPickableItemException(String message) {
        super(message);
    }
}
