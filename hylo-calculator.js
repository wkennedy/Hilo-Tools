// Hylo Protocol Calculators JavaScript
"use strict";

// ============================================================================
// INITIALIZATION
// ============================================================================

// Chart instances for all visualizations
let priceChart, crChart, xsolChart, conversionChart;
let effectiveLeverageChart, priceCompareChart, crChangeChart, bufferAboveDepegChart;

// DOM ready event handler
document.addEventListener('DOMContentLoaded', function () {
    initTabNavigation();
    initCalculators();
});

// ============================================================================
// UI INITIALIZATION
// ============================================================================

/**
 * Initialize tab navigation for both main tabs and chart tabs
 */
function initTabNavigation() {
    // Main tab navigation
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');

            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(`${tabId}-calculator`).classList.add('active');
        });
    });

    // Chart tab navigation
    const chartTabs = document.querySelectorAll('.chart-tab');

    chartTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            chartTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Hide all chart grids
            document.getElementById('main-charts').style.display = 'none';
            document.getElementById('leverage-charts').style.display = 'none';
            document.getElementById('changes-charts').style.display = 'none';

            // Show the selected chart grid
            const chartType = tab.getAttribute('data-chart');
            document.getElementById(`${chartType}-charts`).style.display = 'grid';
        });
    });
}

/**
 * Initialize calculators and button event listeners
 */
function initCalculators() {
    // APY Calculator
    const calculateApyButton = document.getElementById('calculate-apy');
    calculateApyButton.addEventListener('click', calculateApy);

    // Depeg Risk Calculator
    const calculateDepegButton = document.getElementById('calculate-depeg');
    calculateDepegButton.addEventListener('click', calculateDepegRisk);

    // Stress Test
    const runStressTestButton = document.getElementById('run-stress-test');
    runStressTestButton.addEventListener('click', runStressTest);

    // Run initial calculations
    calculateApy();
    calculateDepegRisk();
    runStressTest();
}

// ============================================================================
// APY CALCULATOR
// ============================================================================

/**
 * Calculate APY based on input parameters
 */
function calculateApy() {
    // Get input values
    const tvl = parseFloat(document.getElementById('tvl').value);
    const hyusdSupply = parseFloat(document.getElementById('hyusd-supply').value);
    const stakedPercentage = parseFloat(document.getElementById('staked-percentage').value);
    const baseYield = parseFloat(document.getElementById('base-yield').value);
    const yieldDistribution = parseFloat(document.getElementById('yield-distribution').value);

    // Calculate metrics
    const collateralRatio = (tvl / hyusdSupply) * 100;
    const stakedHyusd = hyusdSupply * (stakedPercentage / 100);
    const yieldMultiple = tvl / stakedHyusd;
    const rawApy = baseYield * (yieldDistribution / 100) * yieldMultiple;

    // Calculate risk-adjusted APY based on collateral ratio
    const riskFactor = calculateRiskFactor(collateralRatio);
    const riskAdjustedApy = rawApy * (1 - riskFactor);
    const annualYield = (rawApy / 100) * 1000; // for $1000 investment

    // Update results
    document.getElementById('collateral-ratio').textContent = collateralRatio.toFixed(2) + '%';
    document.getElementById('current-apy').textContent = rawApy.toFixed(2) + '%';
    document.getElementById('yield-multiple').textContent = yieldMultiple.toFixed(2) + 'x';
    document.getElementById('risk-adjusted-apy').textContent = riskAdjustedApy.toFixed(2) + '%';
    document.getElementById('annual-yield').textContent = '$' + annualYield.toFixed(2);

    // Update staking levels table
    updateStakingLevelsTable(tvl, hyusdSupply, baseYield, yieldDistribution, collateralRatio);
}

/**
 * Calculate risk factor based on collateral ratio
 *
 * The risk factor in the APY calculator represents the probability that staked hyUSD will be converted to xSOL during
 * market stress. This conversion risk increases as the collateral ratio decreases:
 *
 * CR < 130%: Risk factor = 0.4 (40% chance of conversion)
 * CR < 150%: Risk factor = 0.2 (20% chance)
 * CR < 180%: Risk factor = 0.1 (10% chance)
 * CR ≥ 180%: Risk factor = 0.05 (5% chance)
 *
 * The risk-adjusted APY is calculated as: Raw APY × (1 - Risk Factor)
 * This gives a more realistic yield expectation accounting for potential conversion events, which represent a form of
 * impermanent loss since xSOL would likely be worth less during such events.
 *
 * @param {number} collateralRatio - The collateral ratio percentage
 * @returns {number} Risk factor (0-1)
 */
function calculateRiskFactor(collateralRatio) {
    if (collateralRatio < 130) return 0.4;      // High risk
    if (collateralRatio < 150) return 0.2;      // Medium risk
    if (collateralRatio < 180) return 0.1;      // Low risk
    return 0.05;                               // Very low risk
}

/**
 * Update staking levels table with APY for different staking percentages
 */
function updateStakingLevelsTable(tvl, hyusdSupply, baseYield, yieldDistribution, collateralRatio) {
    const tbody = document.querySelector('#staking-levels-table tbody');
    tbody.innerHTML = '';

    const stakingLevels = [10, 20, 30, 40, 50, 60, 70, 80, 90];

    stakingLevels.forEach(stakingLevel => {
        const stakedHyusd = hyusdSupply * (stakingLevel / 100);
        const yieldMultiple = tvl / stakedHyusd;
        const apy = baseYield * (yieldDistribution / 100) * yieldMultiple;

        // Determine risk level
        let riskLevel, riskClass;
        if (stakingLevel < 20) {
            riskLevel = 'High';
            riskClass = 'risk-high';
        } else if (stakingLevel < 40) {
            riskLevel = 'Medium';
            riskClass = 'risk-medium';
        } else {
            riskLevel = 'Low';
            riskClass = 'risk-low';
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${stakingLevel}%</td>
            <td>${apy.toFixed(2)}%</td>
            <td class="${riskClass}">${riskLevel}</td>
        `;
        tbody.appendChild(row);
    });
}

// ============================================================================
// DEPEG RISK CALCULATOR
// ============================================================================

/**
 * Calculate depeg risk based on input parameters
 */
function calculateDepegRisk() {
    // Get input values
    const tvl = parseFloat(document.getElementById('depeg-tvl').value);
    const hyusdSupply = parseFloat(document.getElementById('depeg-hyusd-supply').value);
    const stakedPercentage = parseFloat(document.getElementById('depeg-staked-percentage').value);
    const solPrice = parseFloat(document.getElementById('sol-price').value);
    const solPriceDrop = parseFloat(document.getElementById('sol-price-drop').value);

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

    // Update results
    document.getElementById('current-cr').textContent = currentCr.toFixed(2) + '%';
    document.getElementById('after-drop-cr').textContent = afterDropCr.toFixed(2) + '%';

    const stabilityModeElement = document.getElementById('stability-mode');
    stabilityModeElement.textContent = stabilityMode;
    stabilityModeElement.className = 'result-value ' + stabilityModeClass;

    document.getElementById('hyusd-converted').textContent =
        hyusdConverted.toLocaleString(undefined, {maximumFractionDigits: 0}) +
        ' (' + conversionPercentage.toFixed(2) + '%)';

    const depegProbabilityElement = document.getElementById('depeg-probability');
    depegProbabilityElement.textContent = depegLevel + ' (' + depegProbability + '%)';
    depegProbabilityElement.className = 'result-value ' + depegClass;

    document.getElementById('max-safe-drop').textContent = maxSafeDrop.toFixed(2) + '%';
}

/**
 * Determine stability mode based on collateral ratio
 * @param {number} cr - Collateral ratio after price drop
 * @returns {Object} Stability mode info
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

/**
 * Calculate hyUSD conversion amount based on CR
 * @param {number} cr - Collateral ratio
 * @param {number} stakedHyusd - Amount of staked hyUSD
 * @returns {Object} Conversion amounts
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
 * @param {number} cr - Collateral ratio
 * @returns {Object} Depeg risk information
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

// ============================================================================
// STRESS TEST
// ============================================================================

/**
 * Run stress test simulation with chosen scenario
 */
function runStressTest() {
    // Get input values
    const tvl = parseFloat(document.getElementById('stress-tvl').value);
    const hyusdSupply = parseFloat(document.getElementById('stress-hyusd-supply').value);
    const stakedPercentage = parseFloat(document.getElementById('stress-staked-percentage').value);
    const solPrice = parseFloat(document.getElementById('stress-sol-price').value);
    const scenario = document.getElementById('stress-scenario').value;

    // Define scenario parameters
    const {dropPercent, dropDays} = getScenarioParameters(scenario);

    // Run full stress test simulation with detailed data for charts
    const simulationData = runDetailedSimulation(tvl, hyusdSupply, stakedPercentage, solPrice, dropPercent, dropDays);

    // Update UI with simulation results
    updateStressTestResults(simulationData, tvl, hyusdSupply, stakedPercentage, dropPercent);

    // Update charts
    updateCharts(simulationData);
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
 * Update stress test results in the UI
 */
function updateStressTestResults(simulationData, tvl, hyusdSupply, stakedPercentage, dropPercent) {
    // Calculate key metrics
    const results = {
        minCr: Math.min(...simulationData.map(day => day.collateralRatio)),
        totalHyusdConverted: simulationData.reduce((sum, day) => sum + day.hyusdConverted, 0),
        xsolDrawdown: ((Math.min(...simulationData.map(day => day.xsolPrice)) / simulationData[0].xsolPrice) - 1) * 100,
        daysInMode1: simulationData.filter(day => day.stabilityMode === 'mode1').length,
        daysInMode2: simulationData.filter(day => day.stabilityMode === 'mode2').length
    };

    // Calculate additional metrics
    results.conversionPercentage = (results.totalHyusdConverted / (hyusdSupply * (stakedPercentage / 100))) * 100;
    results.xsolLeverage = Math.abs(results.xsolDrawdown / (dropPercent * -1));
    results.survived = results.minCr > 100;

    // Update results in the UI
    document.getElementById('min-cr').textContent = results.minCr.toFixed(2) + '%';
    document.getElementById('stress-hyusd-converted').textContent =
        results.totalHyusdConverted.toLocaleString(undefined, {maximumFractionDigits: 0}) +
        ' (' + results.conversionPercentage.toFixed(2) + '%)';
    document.getElementById('xsol-drawdown').textContent = results.xsolDrawdown.toFixed(2) + '%';
    document.getElementById('xsol-leverage').textContent = results.xsolLeverage.toFixed(2) + 'x';

    const survivedElement = document.getElementById('survived');
    survivedElement.textContent = results.survived ? 'Yes (maintained peg)' : 'No (lost peg)';
    survivedElement.className = 'result-value ' + (results.survived ? 'risk-low' : 'risk-high');

    document.getElementById('days-mode1').textContent = results.daysInMode1;
    document.getElementById('days-mode2').textContent = results.daysInMode2;
}

/**
 * Run detailed simulation of protocol behavior
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

    // Add recovery metrics
    simulationData.totalCrRecovery = simulationData[simulationData.length - 1].collateralRatio -
        simulationData[dropDays].collateralRatio;

    // Ensure conversion data for visualization
    ensureConversionData(simulationData, stakedHyusd);

    // Update initial CR display
    document.getElementById('initial-cr').textContent = `${initialCr.toFixed(2)}%`;

    return simulationData;
}

/**
 * Generate price path for the simulation
 */
function generatePricePath(initialSolPrice, dropPercent, dropDays) {
    const pricePath = [];

    // Price drop phase
    for (let day = 0; day <= dropDays; day++) {
        const dropProgress = day / dropDays;
        const dayPrice = initialSolPrice * (1 - (dropProgress * (dropPercent / 100)));
        pricePath.push(dayPrice);
    }

    // Recovery phase
    const lowestPrice = initialSolPrice * (1 - (dropPercent / 100));
    for (let day = 1; day <= 10; day++) {
        const recoveryProgress = day / 10;
        const recoveryAmount = (initialSolPrice - lowestPrice) * 0.7;
        const dayPrice = lowestPrice + (recoveryProgress * recoveryAmount);
        pricePath.push(dayPrice);
    }

    return pricePath;
}

/**
 * Initialize day data with enhanced analytics
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

// ============================================================================
// CHART VISUALIZATION
// ============================================================================

/**
 * Update all charts with simulation data
 */
function updateCharts(simulationData) {
    // Create configuration objects for main charts
    const chartConfigs = {
        price: createPriceChartConfig(simulationData),
        cr: createCRChartConfig(simulationData),
        xsol: createXsolChartConfig(simulationData),
        conversion: createConversionChartConfig(simulationData)
    };

    // Create and update the main charts
    updateMainCharts(chartConfigs, simulationData);

    // Create and update additional chart sets
    updateLeverageCharts(simulationData);
    updateChangeCharts(simulationData);
}

/**
 * Create price chart configuration
 */
function createPriceChartConfig(simulationData) {
    return {
        type: 'line',
        data: {
            labels: simulationData.map(day => `Day ${day.day}`),
            datasets: [{
                label: 'SOL Price (USD)',
                data: simulationData.map(day => day.solPrice),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'SOL Price Path'
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Price (USD)'
                    }
                }
            }
        }
    };
}

/**
 * Create collateral ratio chart configuration
 */
function createCRChartConfig(simulationData) {
    return {
        type: 'line',
        data: {
            labels: simulationData.map(day => `Day ${day.day}`),
            datasets: [{
                label: 'Collateral Ratio (%)',
                data: simulationData.map(day => day.collateralRatio),
                borderColor: 'rgb(153, 102, 255)',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Collateral Ratio'
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'CR (%)'
                    }
                }
            }
        }
    };
}

/**
 * Create xSOL price chart configuration
 */
function createXsolChartConfig(simulationData) {
    return {
        type: 'line',
        data: {
            labels: simulationData.map(day => `Day ${day.day}`),
            datasets: [{
                label: 'xSOL Price (USD)',
                data: simulationData.map(day => day.xsolPrice),
                borderColor: 'rgb(255, 159, 64)',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'xSOL Price'
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Price (USD)'
                    }
                }
            }
        }
    };
}

/**
 * Create conversion chart configuration
 */
function createConversionChartConfig(simulationData) {
    return {
        type: 'bar',
        data: {
            labels: simulationData.map(day => `Day ${day.day}`),
            datasets: [{
                label: 'hyUSD Converted',
                data: simulationData.map(day => day.hyusdConverted),
                backgroundColor: 'rgb(255, 99, 132)',
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Daily hyUSD Conversion'
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-US', {
                                    style: 'decimal',
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0
                                }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Amount'
                    }
                }
            }
        }
    };
}

/**
 * Update the main charts (price, CR, xSOL, conversion)
 */
function updateMainCharts(chartConfigs, simulationData) {
    // Destroy existing charts if they exist
    if (priceChart) priceChart.destroy();
    if (crChart) crChart.destroy();
    if (xsolChart) xsolChart.destroy();
    if (conversionChart) conversionChart.destroy();

    // Create new charts
    const priceCtx = document.getElementById('price-chart').getContext('2d');
    priceChart = new Chart(priceCtx, chartConfigs.price);

    const crCtx = document.getElementById('cr-chart').getContext('2d');
    crChart = new Chart(crCtx, chartConfigs.cr);

    const xsolCtx = document.getElementById('xsol-chart').getContext('2d');
    xsolChart = new Chart(xsolCtx, chartConfigs.xsol);

    const conversionCtx = document.getElementById('conversion-chart').getContext('2d');
    conversionChart = new Chart(conversionCtx, chartConfigs.conversion);
}

/**
 * Update leverage effect charts
 */
function updateLeverageCharts(simulationData) {
    // Destroy existing charts if they exist
    if (effectiveLeverageChart) effectiveLeverageChart.destroy();
    if (priceCompareChart) priceCompareChart.destroy();

    // Create effective leverage chart
    const leverageCtx = document.getElementById('leverage-chart').getContext('2d');
    effectiveLeverageChart = new Chart(leverageCtx, {
        type: 'line',
        data: {
            labels: simulationData.map(day => `Day ${day.day}`),
            datasets: [{
                label: 'Effective Leverage',
                data: simulationData.map(day => day.effectiveLeverage || 0),
                borderColor: 'purple',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'xSOL Effective Leverage'
                }
            }
        }
    });

    // Create price comparison chart
    const priceCompareCtx = document.getElementById('price-compare-chart').getContext('2d');
    priceCompareChart = new Chart(priceCompareCtx, {
        type: 'line',
        data: {
            labels: simulationData.map(day => `Day ${day.day}`),
            datasets: [
                {
                    label: 'SOL Price %',
                    data: simulationData.map(day => day.solPriceChangePercent || 0),
                    borderColor: 'blue',
                    tension: 0.1
                },
                {
                    label: 'xSOL Price %',
                    data: simulationData.map(day => day.xsolPriceChangePercent || 0),
                    borderColor: 'red',
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Price Change Comparison (%)'
                }
            }
        }
    });
}

/**
 * Update collateral ratio change charts
 */
function updateChangeCharts(simulationData) {
    // Destroy existing charts if they exist
    if (crChangeChart) crChangeChart.destroy();
    if (bufferAboveDepegChart) bufferAboveDepegChart.destroy();

    // Create CR change chart
    const crChangeCtx = document.getElementById('cr-change-chart').getContext('2d');
    crChangeChart = new Chart(crChangeCtx, {
        type: 'line',
        data: {
            labels: simulationData.map(day => `Day ${day.day}`),
            datasets: [{
                label: 'CR Change from Initial',
                data: simulationData.map(day => day.crChangeFromInitial || 0),
                borderColor: 'green',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Collateral Ratio Change'
                }
            }
        }
    });

    // Create depeg buffer chart
    const depegBufferCtx = document.getElementById('depeg-buffer-chart').getContext('2d');
    bufferAboveDepegChart = new Chart(depegBufferCtx, {
        type: 'line',
        data: {
            labels: simulationData.map(day => `Day ${day.day}`),
            datasets: [{
                label: 'Buffer Above Depeg (%)',
                data: simulationData.map(day => day.depegBuffer || 0),
                borderColor: '#ff7300',
                backgroundColor: 'rgba(255, 115, 0, 0.1)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Distance from Depeg (100% CR)'
                }
            }
        }
    });
}