from __future__ import annotations
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel


class SnapshotRow(BaseModel):
    ts: str
    batch_id: int
    worker_id: int
    zone_id: int

    progress: float
    remaining_qty: float
    time_to_planned_end_min: float
    time_to_deadline_min: float

    zone_backlog: float
    zone_active_workers: int
    zone_location_cnt: int
    zone_blocking_issue_cnt: int

    worker_speed_30m_avg: float

    speed_label: Optional[float] = None
    picked_total: Optional[float] = None
    required_total: Optional[float] = None


class RebalanceRecommendRequest(BaseModel):
    rows: List[SnapshotRow]

    # ✅ 전부 Optional: 백/유저가 안 줘도 됨 (AI가 자동 결정)
    top_risk_zones: Optional[int] = None
    max_moves_cap: Optional[int] = None
    top_workers: Optional[int] = None

    min_active_workers_per_zone: Optional[int] = None
    min_gain_until_deadline: Optional[float] = None
    min_delta_total_risk: Optional[float] = None

    # ✅ 고정 정책(원하면 이것도 Optional로 바꿔도 됨)
    block_risk_discount: float = 0.2
    deadline_urgency_pow: float = 1.0
    lambda_cost: float = 1.0
    mobility_weight: float = 0.15

    all_risk_targets: Optional[int] = None
    worst_case_weight: float = 0.6
    sum_weight: float = 0.4


class ZoneRiskInfo(BaseModel):
    zone_id: int
    backlog: float
    deadline_min: float
    block: int

    capacity_h_before: float
    capacity_h_after: float

    risk_before: float
    risk_after: float
    risk_reduction: float


class Move(BaseModel):
    worker_id: int
    from_zone: int
    to_zone: int

    score: float
    gain_until_deadline: float
    expected_risk_reduction: float
    reason: str


class RebalanceRecommendResponse(BaseModel):
    ts: str
    batch_id: int
    mode: Literal["normal", "all-risk"]

    total_risk_before: float
    total_risk_after: float
    total_expected_risk_reduction: float

    # ✅ 실제 사용된 정책(자동결정 결과 포함)
    policy: Dict[str, Any]

    target_zones: List[ZoneRiskInfo]
    moves: List[Move]
