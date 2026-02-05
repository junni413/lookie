from fastapi import APIRouter
from .schemas import RebalanceRecommendRequest, RebalanceRecommendResponse
from .service import recommend_rebalance

router = APIRouter(prefix="/rebalance", tags=["rebalance"])

@router.post("/recommend", response_model=RebalanceRecommendResponse)
def recommend(req: RebalanceRecommendRequest):
    return recommend_rebalance(req)
