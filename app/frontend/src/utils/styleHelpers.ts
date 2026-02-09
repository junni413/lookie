export const getWorkRateColor = (rate: number = 0) => {
    if (rate >= 80) return "text-primary";
    if (rate >= 40) return "text-blue-600";
    return "text-cyan-600";
};

export const getWorkRateBgColor = (rate: number = 0) => {
    if (rate >= 80) return "bg-primary";
    if (rate >= 40) return "bg-blue-500";
    return "bg-cyan-400";
};
