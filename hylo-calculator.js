// hylo-calculations.js - Pure calculation and business logic
"use strict";

// ============================================================================
// APY CALCULATOR FUNCTIONS
// ============================================================================

/**
 * Calculate APY results based on input parameters
 *
 * @param {number} tvl - Total Value Locked in USD
 * @param {number} hyusdSupply - hyUSD Supply
 * @param {number} stakedPercentage - Percentage of hyUSD staked
 * @param {number} baseYield - Base LST Yield percentage
 * @param {number} yieldDistribution - Yield Distribution to Stakers percentage
 * @returns {Object} Results object with calculated values
 */
export function calculateApyResults(tvl, hyusdSupply, stakedPercentage, baseYield, yieldDistribution) {
    // Calculate metrics
    const collateralRatio = (tvl / hyusdSupply) * 100;
    const stakedHyusd = hyusdSupply * (stakedPercentage / 100);
    const yieldMultiple = tvl / stakedHyusd;
    const rawApy = baseYield * (yieldDistribution / 100) * yieldMultiple;

    // Calculate risk-adjusted APY based on collateral ratio
    const riskFactor = calculateRiskFactor(collateralRatio);
    const riskAdjustedApy = rawApy * (1 - riskFactor);
    const annualYield = (rawApy / 100) * 1000; // for $1000 investment

    // Generate staking levels data
    const stakingLevels = calculateStakingLevels(tvl, hyusdSupply, baseYield, yieldDistribution);

    return {
        collateralRatio,
        stakedHyusd,
        yieldMultiple,
        rawApy,
        riskFactor,
        riskAdjustedApy,
        annualYield,
        stakingLevels
    };
}

/**
 * Determine stability mode based on collateral ratio
 * @param {number} cr - Collateral ratio percentage
 * @returns {Object} Stability mode info with mode and CSS class
 */
function determineStabilityMode(cr) {
    if (cr <= 100) {
        return {
            stabilityMode: 'Depeg Risk (CR ≤ 100%)',
            stabilityModeClass: 'risk-high'
        };
    } else if (cr <= 130) {
        return {
            stabilityMode: 'Critical (Mode 2)',
            stabilityModeClass: 'risk-high'
        };
    } else if (cr <= 150) {
        return {
            stabilityMode: 'Warning (Mode 1)',
            stabilityModeClass: 'risk-medium'
        };
    } else {
        return {
            stabilityMode: 'Normal Operation',
            stabilityModeClass: 'risk-low'
        };
    }
}

// ============================================================================
// STRESS TEST FUNCTIONS
// ============================================================================

/**
 * Run stress test based on input parameters
 *
 * @param {number} tvl - Total Value Locked in USD
 * @param {number} hyusdSupply - hyUSD Supply
 * @param {number} stakedPercentage - Percentage of hyUSD staked
 * @param {number} solPrice - Current SOL Price in USD
 * @param {string} scenario - Stress scenario to run
 * @returns {Object} Results with simulation data and metrics
 */
export function runStressTest(tvl, hyusdSupply, stakedPercentage, solPrice, scenario) {
    // Define scenario parameters
    const {dropPercent, dropDays} = getScenarioParameters(scenario);

    // Run full stress test simulation
    const simulationData = runDetailedSimulation(tvl, hyusdSupply, stakedPercentage, solPrice, dropPercent, dropDays);

    // Calculate key metrics
    const initialCr = (tvl / hyusdSupply) * 100;
    const minCr = Math.min(...simulationData.map(day => day.collateralRatio));
    const finalCr = simulationData[simulationData.length - 1].collateralRatio;
    const totalHyusdConverted = simulationData.reduce((sum, day) => sum + day.hyusdConverted, 0);
    const xsolDrawdown = ((Math.min(...simulationData.map(day => day.xsolPrice)) / simulationData[0].xsolPrice) - 1) * 100;
    const daysInMode1 = simulationData.filter(day => day.stabilityMode === 'mode1').length;
    const daysInMode2 = simulationData.filter(day => day.stabilityMode === 'mode2').length;

    // Calculate additional metrics
    const stakedHyusd = hyusdSupply * (stakedPercentage / 100);
    const conversionPercentage = (totalHyusdConverted / stakedHyusd) * 100;
    const xsolLeverage = Math.abs(xsolDrawdown / (dropPercent * -1));
    const survived = minCr > 100;
    const depegBuffer = minCr - 100;
    const crRecovery = finalCr - minCr;

    // Calculate percentage changes
    const minCrChangePercent = ((minCr - initialCr) / initialCr) * 100;
    const finalCrChangePercent = ((finalCr - initialCr) / initialCr) * 100;

    return {
        // Basic simulation info
        initialCr,
        minCr,
        finalCr,
        minCrChangePercent,
        finalCrChangePercent,

        // Conversion and stability metrics
        totalHyusdConverted,
        conversionPercentage,
        xsolDrawdown,
        xsolLeverage,
        depegBuffer,
        crRecovery,

        // Status metrics
        survived,
        daysInMode1,
        daysInMode2,

        // Full simulation data for charts
        dailyData: simulationData
    };
}

/**
 * Get scenario parameters based on selection
 * @param {string} scenario - Selected scenario
 * @returns {Object} Parameters for scenario
 */
function getScenarioParameters(scenario) {
    switch (scenario) {
        case 'moderate':
            return {dropPercent: 30, dropDays: 7};
        case 'severe':
            return {dropPercent: 50, dropDays: 3};
        case 'extreme':
            return {dropPercent: 70, dropDays: 5};
        case 'flash-crash':
            return {dropPercent: 40, dropDays: 1};
        case 'var-99':
            return {dropPercent: 33, dropDays: 1};
        default:
            return {dropPercent: 30, dropDays: 7};
    }
}

/**
 * Run detailed simulation of protocol behavior
 * @param {number} initialTvl - Initial TVL
 * @param {number} hyusdSupply - hyUSD supply
 * @param {number} stakedPercentage - Staked percentage
 * @param {number} initialSolPrice - Initial SOL price
 * @param {number} dropPercent - Price drop percentage
 * @param {number} dropDays - Days over which drop occurs
 * @returns {Array} Daily simulation data
 */
function runDetailedSimulation(initialTvl, hyusdSupply, stakedPercentage, initialSolPrice, dropPercent, dropDays) {
    // Setup initial state
    const initialCr = (initialTvl / hyusdSupply) * 100;
    let currentTvl = initialTvl;
    let currentHyusdSupply = hyusdSupply;
    let stakedHyusd = hyusdSupply * (stakedPercentage / 100);

    // Initialize variable reserve and xSOL
    const variableReserve = initialTvl - hyusdSupply;
    const xsolSupply = variableReserve / (initialSolPrice / 2);
    const initialXsolPrice = variableReserve / xsolSupply;

    // Generate price path for drop and recovery
    const totalDays = dropDays + 10; // 10 days of recovery
    const pricePath = generatePricePath(initialSolPrice, dropPercent, dropDays);
    const simulationData = new Array(totalDays);

    // Run simulation day by day
    let currentXsolSupply = xsolSupply;

    for (let day = 0; day < pricePath.length; day++) {
        const currentSolPrice = pricePath[day];

        // Update TVL based on SOL price
        currentTvl = initialTvl * (currentSolPrice / initialSolPrice);

        // Calculate daily CR
        const dailyCr = (currentTvl / currentHyusdSupply) * 100;

        // Initialize day data with enhanced analytics
        const dayData = initDayData(
            day, currentSolPrice, initialSolPrice, currentTvl, initialTvl,
            dailyCr, initialCr, currentHyusdSupply, stakedHyusd
        );

        // Calculate xSOL price and leverage
        updateXsolMetrics(dayData, currentTvl, currentHyusdSupply, currentXsolSupply, initialXsolPrice);

        // Apply stability mode actions if needed
        if (dailyCr <= 130) {
            applyStabilityMode(
                dayData, dailyCr, initialCr, stakedHyusd,
                currentHyusdSupply, currentXsolSupply
            );

            // Update references to modified values
            stakedHyusd = dayData.stakedHyusd;
            currentHyusdSupply = dayData.hyusdSupply;
            currentXsolSupply = dayData.xsolSupply;
        }

        // Store day data
        simulationData[day] = dayData;
    }

    // Ensure conversion data for visualization
    ensureConversionData(simulationData, stakedHyusd);

    return simulationData;
}

/**
 * Generate price path for the simulation
 * @param {number} initialSolPrice - Starting SOL price
 * @param {number} dropPercent - Percentage to drop
 * @param {number} dropDays - Days over which drop occurs
 * @returns {Array} Daily price values
 */
function generatePricePath(initialSolPrice, dropPercent, dropDays) {
    const pricePath = [];

    // Price drop phase - notice we're iterating from 0 to dropDays (inclusive),
    // which gives dropDays + 1 elements
    for (let day = 0; day <= dropDays; day++) {
        const dropProgress = day / dropDays;
        const dayPrice = initialSolPrice * (1 - (dropProgress * (dropPercent / 100)));
        pricePath.push(dayPrice);
    }

    // Recovery phase - add 10 more days
    const lowestPrice = initialSolPrice * (1 - (dropPercent / 100));
    for (let day = 1; day <= 10; day++) {
        const recoveryProgress = day / 10;
        const recoveryAmount = (initialSolPrice - lowestPrice) * 0.7;
        const dayPrice = lowestPrice + (recoveryProgress * recoveryAmount);
        pricePath.push(dayPrice);
    }

    // This results in dropDays + 1 + 10 days total
    return pricePath;
}

/**
 * Initialize day data with enhanced analytics
 * @param {number} day - Day number
 * @param {number} currentSolPrice - Current SOL price
 * @param {number} initialSolPrice - Initial SOL price
 * @param {number} currentTvl - Current TVL
 * @param {number} initialTvl - Initial TVL
 * @param {number} dailyCr - Daily collateral ratio
 * @param {number} initialCr - Initial collateral ratio
 * @param {number} currentHyusdSupply - Current hyUSD supply
 * @param {number} stakedHyusd - Amount of staked hyUSD
 * @returns {Object} Day data
 */
function initDayData(day, currentSolPrice, initialSolPrice, currentTvl, initialTvl,
                     dailyCr, initialCr, currentHyusdSupply, stakedHyusd) {
    return {
        day,
        solPrice: currentSolPrice,
        solPriceChangePercent: ((currentSolPrice / initialSolPrice) - 1) * 100,
        tvl: currentTvl,
        tvlChangePercent: ((currentTvl / initialTvl) - 1) * 100,
        collateralRatio: dailyCr,
        crChangeFromInitial: dailyCr - initialCr,
        crChangePercent: ((dailyCr / initialCr) - 1) * 100,
        stabilityMode: dailyCr <= 130 ? 'mode2' : (dailyCr <= 150 ? 'mode1' : 'normal'),
        hyusdSupply: currentHyusdSupply,
        stakedHyusd,
        hyusdConverted: 0,
        xsolMinted: 0,
        daysSinceStart: day,
        // Will calculate these later
        xsolPrice: 0,
        xsolPriceChangePercent: 0,
        effectiveLeverage: 0,
        depegBuffer: dailyCr - 100,
        depegBufferPercent: (dailyCr / 100) - 1
    };
}

/**
 * Update xSOL metrics in day data
 * @param {Object} dayData - Day data object
 * @param {number} currentTvl - Current TVL
 * @param {number} currentHyusdSupply - Current hyUSD supply
 * @param {number} currentXsolSupply - Current xSOL supply
 * @param {number} initialXsolPrice - Initial xSOL price
 */
function updateXsolMetrics(dayData, currentTvl, currentHyusdSupply, currentXsolSupply, initialXsolPrice) {
    const currentVariableReserve = currentTvl - currentHyusdSupply;
    dayData.xsolPrice = currentXsolSupply > 0 ?
        currentVariableReserve / currentXsolSupply : initialXsolPrice;
    dayData.xsolPriceChangePercent = ((dayData.xsolPrice / initialXsolPrice) - 1) * 100;

    // Calculate xSOL leverage (avoid division by zero)
    if (dayData.solPriceChangePercent !== 0) {
        dayData.effectiveLeverage = Math.abs(dayData.xsolPriceChangePercent / dayData.solPriceChangePercent);
    } else {
        dayData.effectiveLeverage = 0;
    }
}

/**
 * Apply stability mode actions
 * @param {Object} dayData - Day data object
 * @param {number} dailyCr - Daily collateral ratio
 * @param {number} initialCr - Initial collateral ratio
 * @param {number} stakedHyusd - Staked hyUSD amount
 * @param {number} currentHyusdSupply - Current hyUSD supply
 * @param {number} currentXsolSupply - Current xSOL supply
 */
function applyStabilityMode(dayData, dailyCr, initialCr, stakedHyusd, currentHyusdSupply, currentXsolSupply) {
    // Make conversion rate proportional to distance from initialCr
    const severityFactor = (initialCr - dailyCr) / initialCr; // How far we've fallen from initial CR
    const conversionRate = Math.min(0.2, (130 - dailyCr) / 100) * (1 + severityFactor);
    const dailyConversion = Math.min(stakedHyusd, stakedHyusd * conversionRate);

    // Ensure minimum visible value
    dayData.hyusdConverted = Math.max(dailyConversion, 0.001);
    dayData.conversionPercentOfStaked = (dayData.hyusdConverted / stakedHyusd) * 100;

    if (dailyConversion > 0) {
        // Update staked and total hyUSD
        stakedHyusd -= dailyConversion;
        currentHyusdSupply -= dailyConversion;

        // Mint equivalent xSOL
        const xsolMinted = dailyConversion / dayData.xsolPrice;
        currentXsolSupply += xsolMinted;
        dayData.xsolMinted = xsolMinted;
    }

    // Update day data with latest values
    dayData.hyusdSupply = currentHyusdSupply;
    dayData.stakedHyusd = stakedHyusd;
    dayData.xsolSupply = currentXsolSupply;
}

/**
 * Ensure conversion data exists for visualization
 * @param {Array} simulationData - Simulation data array
 * @param {number} stakedHyusd - Staked hyUSD amount
 */
function ensureConversionData(simulationData, stakedHyusd) {
    const hasConversions = simulationData.some(day => day && day.hyusdConverted > 0);

    if (!hasConversions) {
        // Find the worst day for visualization
        const worstDay = simulationData.reduce((worst, current) =>
                current && current.collateralRatio < worst.collateralRatio ? current : worst,
            simulationData.find(day => day));

        if (worstDay) {
            worstDay.hyusdConverted = stakedHyusd * 0.01; // 1% conversion for visualization
        }
    }
}

/**
 * Calculate hyUSD conversion amount based on CR
 * @param {number} cr - Collateral ratio percentage
 * @param {number} stakedHyusd - Amount of staked hyUSD
 * @returns {Object} Conversion amounts and percentages
 */
function calculateHyusdConversion(cr, stakedHyusd) {
    if (cr <= 130) {
        // Conversion rate increases as CR drops below 130%
        const conversionRate = Math.min(1, (130 - cr) / 30);
        const hyusdConverted = stakedHyusd * conversionRate;
        const conversionPercentage = (hyusdConverted / stakedHyusd) * 100;
        return {hyusdConverted, conversionPercentage};
    }
    return {hyusdConverted: 0, conversionPercentage: 0};
}

/**
 * Calculate depeg probability based on collateral ratio
 * @param {number} cr - Collateral ratio percentage
 * @returns {Object} Depeg risk information with probability, level and CSS class
 */
function calculateDepegProbability(cr) {
    if (cr <= 100) {
        return {depegProbability: 99, depegLevel: 'Extreme', depegClass: 'risk-high'};
    } else if (cr <= 110) {
        return {depegProbability: 75, depegLevel: 'High', depegClass: 'risk-high'};
    } else if (cr <= 120) {
        return {depegProbability: 50, depegLevel: 'Medium', depegClass: 'risk-medium'};
    } else if (cr <= 130) {
        return {depegProbability: 25, depegLevel: 'Low', depegClass: 'risk-low'};
    } else {
        return {depegProbability: 5, depegLevel: 'Very Low', depegClass: 'risk-low'};
    }
}

/**
 * Calculate risk factor based on collateral ratio
 * @param {number} collateralRatio - Collateral ratio percentage
 * @returns {number} Risk factor (0-1)
 */
function calculateRiskFactor(collateralRatio) {
    if (collateralRatio < 130) return 0.4;      // High risk
    if (collateralRatio < 150) return 0.2;      // Medium risk
    if (collateralRatio < 180) return 0.1;      // Low risk
    return 0.05;                               // Very low risk
}

/**
 * Calculate APY for different staking percentage levels
 * @param {number} tvl - Total Value Locked
 * @param {number} hyusdSupply - hyUSD Supply
 * @param {number} baseYield - Base yield percentage
 * @param {number} yieldDistribution - Yield distribution percentage
 * @returns {Array} Array of staking level objects with APY and risk info
 */
function calculateStakingLevels(tvl, hyusdSupply, baseYield, yieldDistribution) {
    const stakingLevels = [10, 20, 30, 40, 50, 60, 70, 80, 90];

    return stakingLevels.map(percentage => {
        const stakedHyusd = hyusdSupply * (percentage / 100);
        const yieldMultiple = tvl / stakedHyusd;
        const apy = baseYield * (yieldDistribution / 100) * yieldMultiple;

        // Determine risk level
        let riskLevel, riskClass;
        if (percentage < 20) {
            riskLevel = 'High';
            riskClass = 'risk-high';
        } else if (percentage < 40) {
            riskLevel = 'Medium';
            riskClass = 'risk-medium';
        } else {
            riskLevel = 'Low';
            riskClass = 'risk-low';
        }

        return {
            percentage,
            apy,
            riskLevel,
            riskClass
        };
    });
}

// ============================================================================
// DEPEG RISK CALCULATOR FUNCTIONS
// ============================================================================

/**
 * Calculate depeg risk results based on input parameters
 *
 * @param {number} tvl - Total Value Locked in USD
 * @param {number} hyusdSupply - hyUSD Supply
 * @param {number} stakedPercentage - Percentage of hyUSD staked
 * @param {number} solPrice - Current SOL Price in USD
 * @param {number} solPriceDrop - SOL Price Drop to Evaluate (percentage)
 * @returns {Object} Results object with calculated values
 */
export function calculateDepegRiskResults(tvl, hyusdSupply, stakedPercentage, solPrice, solPriceDrop) {
    // Calculate metrics
    const currentCr = (tvl / hyusdSupply) * 100;
    const stakedHyusd = hyusdSupply * (stakedPercentage / 100);

    // Calculate new TVL and CR after price drop
    const newSolPrice = solPrice * (1 - (solPriceDrop / 100));
    const newTvl = tvl * (newSolPrice / solPrice);
    const afterDropCr = (newTvl / hyusdSupply) * 100;

    // Determine stability mode
    const {stabilityMode, stabilityModeClass} = determineStabilityMode(afterDropCr);

    // Estimate hyUSD conversion from stability pool
    const {hyusdConverted, conversionPercentage} = calculateHyusdConversion(afterDropCr, stakedHyusd);

    // Calculate depeg probability
    const {depegProbability, depegLevel, depegClass} = calculateDepegProbability(afterDropCr);

    // Calculate maximum safe SOL drop
    const maxSafeDrop = (1 - (130 / currentCr)) * 100;

    return {
        currentCr,
        afterDropCr,
        stabilityMode,
        stabilityModeClass,
        hyusdConverted,
        conversionPercentage,
        depegProbability,
        depegLevel,
        depegClass,
        maxSafeDrop
    };
}