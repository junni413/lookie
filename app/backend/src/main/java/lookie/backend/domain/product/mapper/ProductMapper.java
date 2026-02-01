package lookie.backend.domain.product.mapper;

import lookie.backend.domain.product.vo.ProductVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ProductMapper {
    ProductVO findByBarcode(@Param("barcode") String barcode);

    ProductVO findById(@Param("productId") Long productId);
}
