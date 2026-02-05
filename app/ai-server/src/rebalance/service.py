from __future__ import annotations

import json
import math
import os
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Any

import numpy as np
import pandas as pd
from catboost import CatBoostRegressor

from .schemas import (
    SnapshotRow,
    RebalanceRecommendRequest,
    RebalanceRecommendResponse,
    ZoneRiskInfo,
    Move,
)

# -----------------------------
# Model loading (singleton)
# -----------------------------
_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_MODEL_DIR = os.path.join(_BASE_DIR, "model")
_MODEL_PATH = os.path.join(_MODEL_DIR, "rebalance_speed_catboost.cbm")
_META_PATH = os.path.join(_MODEL_DIR, "rebalance_speed_meta.json")

_model: Optional[CatBoostRegressor] = None
_features: Optional[List[str]] = None


def _load_model_once() -> Tuple[CatBoostRegressor, List[str]]:
    global _model, _features
    if _model is not None and _features is not None:
        return _model, _features

    if not os.path.exists(_MODEL_PATH):
        raise FileNotFoundError(f"CatBoost model not found: {_MODEL_PATH}")

    m = CatBoostRegressor()
    m.load_model(_MODEL_PATH)

    feats = None
    if os.path.exists(_META_PATH):
        with open(_META_PATH, "r", encoding="utf-8") as f:
            meta = json.load(f)
        feats = meta.get("features") or meta.get("FEATURES")

    if not feats:
        feats = [
            "progress",
            "remaining_qty",
            "time_to_planned_end_min",
            "time_to_deadline_min",
            "zone_backlog",
            "zone_active_workers",
            "zone_location_cnt",
            "zone_blocking_issue_cnt",
            "worker_speed_30m_avg",
        ]

    _model, _features = m, list(feats)
    return _model, _features


def _rows_to_feature_df(rows: List[SnapshotRow], features: List[str]) -> pd.DataFrame:
    df = pd.DataFrame([r.model_dump() for r in rows])

    for c in features:
        if c not in df.columns:
            df[c] = 0.0

    df = df[features].copy()
    for c in df.columns:
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0.0)

    return df


def predict_speed(rows: List[SnapshotRow]) -> np.ndarray:
    model, features = _load_model_once()
    X = _rows_to_feature_df(rows, features)
    pred = model.predict(X)
    pred = np.asarray(pred, dtype=float)
    return np.clip(pred, 0.0, None)


# -----------------------------
# Risk / objective helpers
# -----------------------------
@dataclass
class ZoneState:
    backlog: float
    deadline_min: float
    block_cnt: int
    urgency_w: float = 1.0


def deadline_weight(deadline_min: float, pow_: float) -> float:
    t = max(deadline_min, 0.0)
    return (1.0 / (1.0 + t / 60.0)) ** pow_


def compute_zone_risk(
    zone_state: Dict[int, ZoneState],
    cap_h: Dict[int, float],
    block_discount: float,
) -> Dict[int, float]:
    risk = {}
    for z, st in zone_state.items():
        cap_until = max(cap_h.get(z, 0.0), 0.0) * (max(st.deadline_min, 0.0) / 60.0)
        miss = max(st.backlog - cap_until, 0.0)
        if st.block_cnt > 0:
            miss *= float(block_discount)
        risk[z] = float(miss)
    return risk


def mobility_score(row: SnapshotRow, from_zone_risk: float) -> float:
    rem = max(float(row.remaining_qty), 0.0)
    tte = max(float(row.time_to_planned_end_min), 0.0)
    return (1.0 / (1.0 + rem)) + 0.01 * tte - 0.002 * from_zone_risk


def gain_until_deadline(speed_pred_h: float, deadline_min_to: float) -> float:
    return max(speed_pred_h, 0.0) * (max(deadline_min_to, 0.0) / 60.0)


def apply_move_caps(
    cap_h: Dict[int, float],
    from_zone: int,
    to_zone: int,
    speed_pred_h: float,
) -> Dict[int, float]:
    new_cap = dict(cap_h)
    new_cap[from_zone] = max(new_cap.get(from_zone, 0.0) - speed_pred_h, 0.0)
    new_cap[to_zone] = max(new_cap.get(to_zone, 0.0) + speed_pred_h, 0.0)
    return new_cap


def _clamp_int(x: int, lo: int, hi: int) -> int:
    return int(max(lo, min(hi, x)))


def _q(arr: List[float], q: float, default: float = 0.0) -> float:
    if not arr:
        return default
    return float(np.quantile(np.asarray(arr, dtype=float), q))


# -----------------------------
# ✅ Auto parameter tuning
# -----------------------------
def auto_tune_params(
    rows: List[SnapshotRow],
    speed_pred_map: Dict[int, float],
    zone_state: Dict[int, ZoneState],
    cap_h: Dict[int, float],
    risk_before: Dict[int, float],
) -> Dict[str, Any]:
    workers = len(rows)
    zones = len(zone_state)

    # 위험 zone 집합(>0)
    risk_pos = [v for v in risk_before.values() if v > 0]
    max_risk = max(risk_before.values()) if risk_before else 0.0
    sum_risk = sum(risk_before.values()) if risk_before else 0.0

    # 1) top_risk_zones: 위험 zone이 많아도 너무 넓게 퍼지지 않게 25% 정도만
    if risk_pos:
        med = float(np.median(risk_pos))
        threshold = max(med, 0.1 * max(risk_pos))
        candidates = [(z, r) for z, r in risk_before.items() if r >= threshold and r > 0]
        candidates.sort(key=lambda x: x[1], reverse=True)
        k_max = _clamp_int(int(math.ceil(zones * 0.25)), 2, 5)
        top_risk_zones = min(len(candidates), k_max) if candidates else min(len(risk_pos), 2)
        top_risk_zones = _clamp_int(top_risk_zones, 1, 5)
    else:
        top_risk_zones = 1

    # 2) max_moves_cap: 전체 인원의 8% & zone의 절반 중 작은 값, 2~8 범위
    cap1 = int(math.ceil(workers * 0.08))
    cap2 = int(math.ceil(zones * 0.5))
    max_moves_cap = _clamp_int(min(max(2, cap1), max(2, cap2)), 2, 8)

    # 3) top_workers: 전체의 60% 정도를 후보로 보되 15~60
    top_workers = _clamp_int(int(math.ceil(workers * 0.6)), 15, 60)

    # 4) min_active_workers_per_zone: 평균의 25% (최대 3)
    actives = [int(r.zone_active_workers) for r in rows]
    mean_active = float(np.mean(actives)) if actives else 1.0
    min_active_workers_per_zone = _clamp_int(int(math.floor(mean_active * 0.25)), 1, 3)

    # 5) min_gain_until_deadline: (촉박한 target 기준) gain 분포의 35% 분위수, 하한 10
    min_deadline = min((st.deadline_min for st in zone_state.values()), default=60.0)
    gains = [
        gain_until_deadline(speed_pred_map[r.worker_id], min_deadline)
        for r in rows
    ]
    min_gain_until_deadline = max(_q(gains, 0.35, default=10.0), 10.0)

    # 6) min_delta_total_risk: risk 분포의 20% 분위수 vs 전체의 3% 중 큰 값
    base = max(_q(list(risk_before.values()), 0.20, default=0.0), 0.03 * float(sum_risk))
    # 너무 빡세지 않게 상한
    if max_risk > 0:
        base = min(base, 0.2 * float(max_risk))
    min_delta_total_risk = float(max(base, 1.0))

    # 7) all_risk_targets: all-risk일 때만 쓰는 target 수(최대 3)
    all_risk_targets = _clamp_int(int(math.ceil(zones * 0.25)), 2, 3)

    return {
        "top_risk_zones": top_risk_zones,
        "max_moves_cap": max_moves_cap,
        "top_workers": top_workers,
        "min_active_workers_per_zone": min_active_workers_per_zone,
        "min_gain_until_deadline": float(min_gain_until_deadline),
        "min_delta_total_risk": float(min_delta_total_risk),
        "all_risk_targets": all_risk_targets,
    }


# -----------------------------
# Main recommendation
# -----------------------------
def recommend_rebalance(req: RebalanceRecommendRequest) -> RebalanceRecommendResponse:
    rows = req.rows
    if not rows:
        raise ValueError("rows is empty")

    ts = rows[0].ts
    batch_id = rows[0].batch_id

    # 1) speed_pred 예측
    sp = predict_speed(rows)
    speed_pred_map = {r.worker_id: float(sp[i]) for i, r in enumerate(rows)}

    # 2) zone 상태 구성
    zone_state: Dict[int, ZoneState] = {}
    zone_active_workers: Dict[int, int] = {}
    for r in rows:
        zone_state.setdefault(
            r.zone_id,
            ZoneState(
                backlog=float(max(r.zone_backlog, 0.0)),
                deadline_min=float(r.time_to_deadline_min),
                block_cnt=int(r.zone_blocking_issue_cnt),
            ),
        )
        zone_active_workers[r.zone_id] = int(r.zone_active_workers)

    for z, st in zone_state.items():
        st.urgency_w = deadline_weight(st.deadline_min, req.deadline_urgency_pow)

    # 3) zone capacity 합
    cap_h: Dict[int, float] = {z: 0.0 for z in zone_state.keys()}
    for r in rows:
        cap_h[r.zone_id] += speed_pred_map[r.worker_id]

    risk_before = compute_zone_risk(zone_state, cap_h, req.block_risk_discount)
    total_risk_before = float(sum(risk_before.values()))
    all_risk = (len(risk_before) > 0) and all(v > 0 for v in risk_before.values())

    # ✅ 4) 자동 파라미터 결정(요청에 없으면)
    tuned = auto_tune_params(rows, speed_pred_map, zone_state, cap_h, risk_before)

    top_risk_zones = req.top_risk_zones if req.top_risk_zones is not None else tuned["top_risk_zones"]
    max_moves_cap = req.max_moves_cap if req.max_moves_cap is not None else tuned["max_moves_cap"]
    top_workers = req.top_workers if req.top_workers is not None else tuned["top_workers"]
    min_active_workers_per_zone = (
        req.min_active_workers_per_zone
        if req.min_active_workers_per_zone is not None
        else tuned["min_active_workers_per_zone"]
    )
    min_gain_until_deadline = (
        req.min_gain_until_deadline
        if req.min_gain_until_deadline is not None
        else tuned["min_gain_until_deadline"]
    )
    min_delta_total_risk = (
        req.min_delta_total_risk
        if req.min_delta_total_risk is not None
        else tuned["min_delta_total_risk"]
    )
    all_risk_targets = (
        req.all_risk_targets
        if req.all_risk_targets is not None
        else tuned["all_risk_targets"]
    )

    policy = {
        "auto": {
            **tuned,
        },
        "effective": {
            "top_risk_zones": int(top_risk_zones),
            "max_moves_cap": int(max_moves_cap),
            "top_workers": int(top_workers),
            "min_active_workers_per_zone": int(min_active_workers_per_zone),
            "min_gain_until_deadline": float(min_gain_until_deadline),
            "min_delta_total_risk": float(min_delta_total_risk),
            "all_risk_targets": int(all_risk_targets),
        },
        "fixed": {
            "block_risk_discount": float(req.block_risk_discount),
            "deadline_urgency_pow": float(req.deadline_urgency_pow),
            "lambda_cost": float(req.lambda_cost),
            "mobility_weight": float(req.mobility_weight),
            "worst_case_weight": float(req.worst_case_weight),
            "sum_weight": float(req.sum_weight),
        },
    }

    # 5) targets 선정
    if not all_risk:
        mode = "normal"
        risk_z = sorted(
            [(z, rv) for z, rv in risk_before.items() if rv > 0],
            key=lambda x: x[1],
            reverse=True,
        )
        targets = [z for z, _ in risk_z[: max(int(top_risk_zones), 1)]]
        if not targets:
            return RebalanceRecommendResponse(
                ts=ts,
                batch_id=batch_id,
                mode="normal",
                total_risk_before=total_risk_before,
                total_risk_after=total_risk_before,
                total_expected_risk_reduction=0.0,
                policy=policy,
                target_zones=[],
                moves=[],
            )
    else:
        mode = "all-risk"
        risk_z = sorted(risk_before.items(), key=lambda x: x[1], reverse=True)
        targets = [z for z, _ in risk_z[: max(int(all_risk_targets), 1)]]

    target_set = set(targets)

    # 6) donor 후보 (mobility 상위)
    donor_rows = []
    for r in rows:
        ms = mobility_score(r, risk_before.get(r.zone_id, 0.0))
        donor_rows.append((ms, r))
    donor_rows.sort(key=lambda x: x[0], reverse=True)
    donor_rows = donor_rows[: max(int(top_workers), 1)]

    def weighted_sum_risk(risk_map: Dict[int, float]) -> float:
        return float(sum(zone_state[z].urgency_w * risk_map.get(z, 0.0) for z in zone_state))

    def objective(risk_map: Dict[int, float]) -> float:
        worst = max((risk_map.get(z, 0.0) for z in target_set), default=0.0)
        s = weighted_sum_risk(risk_map)
        return float(req.worst_case_weight * worst + req.sum_weight * s)

    used_workers = set()
    chosen_moves: List[Move] = []
    current_cap = dict(cap_h)
    current_risk = dict(risk_before)
    base_obj = objective(current_risk)

    for _ in range(max(int(max_moves_cap), 0)):
        best: Optional[Tuple[float, Move, Dict[int, float], Dict[int, float]]] = None

        for ms, r in donor_rows:
            wid = r.worker_id
            if wid in used_workers:
                continue

            from_zone = r.zone_id
            if zone_active_workers.get(from_zone, 0) <= int(min_active_workers_per_zone):
                continue

            sp_h = speed_pred_map[wid]

            for to_zone in targets:
                if to_zone == from_zone:
                    continue

                gain = gain_until_deadline(sp_h, zone_state[to_zone].deadline_min)
                if gain < float(min_gain_until_deadline):
                    continue

                new_cap = apply_move_caps(current_cap, from_zone, to_zone, sp_h)
                new_risk = compute_zone_risk(zone_state, new_cap, req.block_risk_discount)

                delta_total = float(sum(current_risk.values()) - sum(new_risk.values()))

                benefit = current_risk.get(to_zone, 0.0) - new_risk.get(to_zone, 0.0)
                cost = new_risk.get(from_zone, 0.0) - current_risk.get(from_zone, 0.0)

                new_obj = objective(new_risk)
                obj_improve = float(base_obj - new_obj)

                score = (
                    1.0 * max(benefit, 0.0)
                    - req.lambda_cost * max(cost, 0.0)
                    + req.mobility_weight * max(ms, 0.0)
                    + 0.5 * max(obj_improve, 0.0)
                )

                if best is None or score > best[0]:
                    reason = (
                        f"[{mode}] 마감 미스(risk) 감소 목적. "
                        f"to risk↓={benefit:.2f}, from risk↑={cost:.2f}, "
                        f"speed_pred={sp_h:.2f} qty/h, "
                        f"deadline까지 추가처리량={gain:.1f}, "
                        f"총위험감소(추정)={max(delta_total,0.0):.1f}."
                    )
                    mv = Move(
                        worker_id=int(wid),
                        from_zone=int(from_zone),
                        to_zone=int(to_zone),
                        score=float(score),
                        gain_until_deadline=float(gain),
                        expected_risk_reduction=float(max(delta_total, 0.0)),
                        reason=reason,
                    )
                    best = (score, mv, new_cap, new_risk)

        if best is None:
            break

        best_score, best_move, best_cap, best_risk = best

        # ✅ stop rule(자동 인원): 개선이 작으면 멈춤
        delta_total = float(sum(current_risk.values()) - sum(best_risk.values()))
        if delta_total < float(min_delta_total_risk):
            break

        used_workers.add(best_move.worker_id)
        chosen_moves.append(best_move)

        current_cap = best_cap
        current_risk = best_risk
        base_obj = objective(current_risk)

        if mode == "normal":
            if all(current_risk.get(z, 0.0) <= 0 for z in target_set):
                break

    risk_after = current_risk
    total_risk_after = float(sum(risk_after.values()))
    total_red = float(max(total_risk_before - total_risk_after, 0.0))

    target_infos: List[ZoneRiskInfo] = []
    for z in targets:
        st = zone_state[z]
        target_infos.append(
            ZoneRiskInfo(
                zone_id=int(z),
                backlog=float(st.backlog),
                deadline_min=float(st.deadline_min),
                block=int(1 if st.block_cnt > 0 else 0),
                capacity_h_before=float(cap_h.get(z, 0.0)),
                capacity_h_after=float(current_cap.get(z, 0.0)),
                risk_before=float(risk_before.get(z, 0.0)),
                risk_after=float(risk_after.get(z, 0.0)),
                risk_reduction=float(max(risk_before.get(z, 0.0) - risk_after.get(z, 0.0), 0.0)),
            )
        )

    return RebalanceRecommendResponse(
        ts=ts,
        batch_id=batch_id,
        mode=mode,
        total_risk_before=total_risk_before,
        total_risk_after=total_risk_after,
        total_expected_risk_reduction=total_red,
        policy=policy,
        target_zones=target_infos,
        moves=chosen_moves,
    )
