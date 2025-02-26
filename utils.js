// Helper functions for calculations

// Helper function to calculate xSOL effective leverage
function calculateXsolLeverage(tvl, xsolMarketCap) {
    return tvl / xsolMarketCap;
}

// Helper function to calculate stability pool APY
function calculateStabilityPoolAPY(totalTvl, stakedHyusdValue, baseYield, yieldDistribution) {
    return baseYield * (yieldDistribution / 100) * (totalTvl / stakedHyusdValue);
}

// Helper function to estimate depeg risk based on Collateral Ratio
function estimateDepegRisk(collateralRatio) {
    if (collateralRatio >= 200) return 1; // 1% risk
    if (collateralRatio >= 150) return 5; // 5% risk
    if (collateralRatio >= 130) return 20; // 20% risk
    if (collateralRatio >= 110) return 50; // 50% risk
    return 90; // 90% risk below 110%
}

// Helper function to calculate true LST value (simplified for simulation)
function calculateTrueLstValue(amountOfSolInStakePool, totalLstSupply) {
    return amountOfSolInStakePool / totalLstSupply;
}

// Helper function to calculate hyUSD NAV in SOL
function calculateHyusdNavInSol(solPriceUsd) {
    return 1 / solPriceUsd;
}

// Helper function to calculate xSOL NAV in SOL
function calculateXsolNavInSol(totalSolInReserve, hyusdNavInSol, hyusdSupply, xsolSupply) {
    const variableReserve = totalSolInReserve - (hyusdNavInSol * hyusdSupply);
    if (xsolSupply <= 0) return 1; // Default value if no xSOL supply
    return variableReserve / xsolSupply;
}

// Helper function to format currency values
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

// Helper function to format percentages
function formatPercent(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value / 100);
}