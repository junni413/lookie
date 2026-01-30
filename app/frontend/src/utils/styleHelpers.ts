export const getWorkRateColor = (rate: number = 0) => {
    if (rate >= 80) return "text-indigo-600";
    if (rate >= 40) return "text-blue-600";
    return "text-cyan-600";
};

export const getWorkRateBgColor = (rate: number = 0) => {
    if (rate >= 80) return "bg-indigo-600";
    if (rate >= 40) return "bg-blue-500";
    return "bg-cyan-400";
};
