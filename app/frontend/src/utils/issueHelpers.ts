

/**
 * 긴급도에 따른 배지 스타일 및 텍스트 반환
 * @param urgency 긴급도 점수 (낮을수록 긴급)
 */
export const getUrgencyInfo = (urgency: number | undefined) => {
    let text = "LOW";
    let className = "bg-green-100 text-green-800";

    if (urgency !== undefined) {
        if (urgency <= 2) {
            text = "HIGH";
            className = "bg-red-100 text-red-800";
        } else if (urgency === 3) {
            text = "MID";
            className = "bg-yellow-100 text-yellow-800";
        }
    }

    return { text, className };
};

/**
 * AI 판정 결과에 따른 스타일 반환
 */
export const getAiDecisionColor = (decision: string | undefined) => {
    if (!decision) return "text-gray-400";
    if (decision === "PASS") return "text-green-600";
    if (decision === "UNKNOWN") return "text-gray-500";
    return "text-red-600"; // FAIL or others
};
