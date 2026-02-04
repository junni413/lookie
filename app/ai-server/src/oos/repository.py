# src/oos/repository.py
import pymysql
from src.core.config import DB_CONFIG

class OOSRepository:
    def _get_connection(self):
        return pymysql.connect(
            host=DB_CONFIG["host"],
            user=DB_CONFIG["user"],
            password=DB_CONFIG["password"],
            db=DB_CONFIG["db"],
            charset=DB_CONFIG["charset"],
            cursorclass=pymysql.cursors.DictCursor
        )

    def get_all_data(self, item_id: int):
        """상품 정보와 모든 관련 로그를 한 번에 조회"""
        conn = self._get_connection()
        try:
            with conn.cursor() as cursor:
                # 1. 상품 기본 정보 & 재고
                sql_product = "SELECT * FROM demo_products WHERE item_id = %s"
                cursor.execute(sql_product, (item_id,))
                product = cursor.fetchone()

                if not product:
                    return None

                # 2. WMS 로그 (이동)
                sql_wms = "SELECT * FROM ext_wms_move_logs WHERE item_id = %s ORDER BY log_time DESC LIMIT 1"
                cursor.execute(sql_wms, (item_id,))
                wms_log = cursor.fetchone()

                # 3. OMS 로그 (출고/판매)
                sql_oms = "SELECT * FROM ext_oms_picking_logs WHERE item_id = %s ORDER BY log_time DESC LIMIT 1"
                cursor.execute(sql_oms, (item_id,))
                oms_log = cursor.fetchone()

                # 4. QMS 로그 (불량/보류)
                sql_qms = "SELECT * FROM ext_qms_inspection_logs WHERE item_id = %s ORDER BY log_time DESC LIMIT 1"
                cursor.execute(sql_qms, (item_id,))
                qms_log = cursor.fetchone()

                return {
                    "product": product,
                    "wms": wms_log,
                    "oms": oms_log,
                    "qms": qms_log
                }
        finally:
            conn.close()