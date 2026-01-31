package lookie.backend.domain.product.exception;

public class ProductNotFoundException extends RuntimeException {
    public ProductNotFoundException(String barcode) {
        super("상품을 찾을 수 없습니다: " + barcode);
    }
}
