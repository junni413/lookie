import os
import time
import argparse


def _env(name: str, default: str | None = None) -> str | None:
    value = os.getenv(name)
    return value if value is not None else default


def main() -> int:
    parser = argparse.ArgumentParser(description="Simulate worker location moves for control map.")
    parser.add_argument("--duration", type=int, default=300, help="Total duration in seconds (default: 300)")
    parser.add_argument("--step", type=int, default=3, help="Update interval in seconds (default: 3)")
    parser.add_argument("--host", default=_env("DB_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(_env("DB_PORT", "3307") or 3306))
    parser.add_argument("--db", default=_env("DB_NAME", _env("MYSQL_DATABASE", "lookie")))
    parser.add_argument("--user", default=_env("DB_USERNAME", _env("MYSQL_USER", "lookie")))
    parser.add_argument("--password", default=_env("DB_PASSWORD", _env("MYSQL_PASSWORD", "lookie123")))
    args = parser.parse_args()

    try:
        import mysql.connector  # type: ignore
    except Exception as e:
        print("Missing dependency: mysql-connector-python")
        print("Install: pip install mysql-connector-python")
        print(f"Import error: {e}")
        return 1

    conn = mysql.connector.connect(
        host=args.host,
        port=args.port,
        user=args.user,
        password=args.password,
        database=args.db,
        autocommit=True,
    )

    update_sql = """
    UPDATE batch_tasks bt
    JOIN users u ON u.user_id = bt.worker_id
    SET
      bt.current_location_id = (
        SELECT zl.location_id
        FROM zone_locations zl
        WHERE zl.zone_id = COALESCE(bt.zone_id, u.assigned_zone_id)
          AND zl.is_active = 1
        ORDER BY RAND()
        LIMIT 1
      ),
      bt.location_scanned_at = NOW()
    WHERE bt.status = 'IN_PROGRESS'
      AND bt.worker_id IS NOT NULL
    """

    try:
        with conn.cursor() as cur:
            elapsed = 0
            while elapsed < args.duration:
                cur.execute(update_sql)
                time.sleep(args.step)
                elapsed += args.step
    finally:
        conn.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
