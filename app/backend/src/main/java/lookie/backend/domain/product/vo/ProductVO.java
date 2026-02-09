package lookie.backend.domain.product.vo;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.apache.ibatis.type.Alias;

@Getter
@Setter
@ToString
@Alias("ProductVO")
public class ProductVO {
    private Long productId;
    private String barcode;
    private String productName;
    private String productImage;
    private Long locationId;
    private Long zoneId;
}
