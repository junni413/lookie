package lookie.backend.global.config;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@MapperScan("lookie.backend.domain.**.mapper")
public class MyBatisConfig {

}
