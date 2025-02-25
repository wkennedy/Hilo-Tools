// Hylo Protocol Calculators JavaScript
document.addEventListener('DOMContentLoaded', function () {
    // Tab functionality
    const chartTabs = document.querySelectorAll('.chart-tab');

    chartTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            chartTabs.forEach(t => t.classList.remove('active'));

            // Add active class to clicked tab
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

    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');

            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            document.getElementById(`${tabId}-calculator`).classList.add('active');
        });
    });

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
});

// Chart instances
let priceChart, crChart, xsolChart, conversionChart;
let effectiveLeverageChart, priceCompareChart, crChangeChart, bufferAboveDepegChart;

// APY Calculator Functions
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

    // Calculate risk-adjusted APY (simplified model)
    let riskFactor = 0;
    if (collateralRatio < 130) {
        riskFactor = 0.4; // High risk of conversion
    } else if (collateralRatio < 150) {
        riskFactor = 0.2; // Medium risk
    } else if (collateralRatio < 180) {
        riskFactor = 0.1; // Low risk
    } else {
        riskFactor = 0.05; // Very low risk
    }

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

// Depeg Risk Calculator Functions
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
    let stabilityMode, stabilityModeClass;
    if (afterDropCr <= 100) {
        stabilityMode = 'Depeg Risk (CR ≤ 100%)';
        stabilityModeClass = 'risk-high';
    } else if (afterDropCr <= 130) {
        stabilityMode = 'Critical (Mode 2)';
        stabilityModeClass = 'risk-high';
    } else if (afterDropCr <= 150) {
        stabilityMode = 'Warning (Mode 1)';
        stabilityModeClass = 'risk-medium';
    } else {
        stabilityMode = 'Normal Operation';
        stabilityModeClass = 'risk-low';
    }

    // Estimate hyUSD conversion from stability pool
    let hyusdConverted = 0;
    let conversionPercentage = 0;

    if (afterDropCr <= 130) {
        // Simplified model: conversion rate increases as CR drops below 130%
        const conversionRate = Math.min(1, (130 - afterDropCr) / 30);
        hyusdConverted = stakedHyusd * conversionRate;
        conversionPercentage = (hyusdConverted / stakedHyusd) * 100;
    }

    // Calculate depeg probability
    let depegProbability, depegLevel, depegClass;
    if (afterDropCr <= 100) {
        depegProbability = 99;
        depegLevel = 'Extreme';
        depegClass = 'risk-high';
    } else if (afterDropCr <= 110) {
        depegProbability = 75;
        depegLevel = 'High';
        depegClass = 'risk-high';
    } else if (afterDropCr <= 120) {
        depegProbability = 50;
        depegLevel = 'Medium';
        depegClass = 'risk-medium';
    } else if (afterDropCr <= 130) {
        depegProbability = 25;
        depegLevel = 'Low';
        depegClass = 'risk-low';
    } else {
        depegProbability = 5;
        depegLevel = 'Very Low';
        depegClass = 'risk-low';
    }

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

// Stress Test Functions
function runStressTest() {
    // Get input values
    const tvl = parseFloat(document.getElementById('stress-tvl').value);
    const hyusdSupply = parseFloat(document.getElementById('stress-hyusd-supply').value);
    const stakedPercentage = parseFloat(document.getElementById('stress-staked-percentage').value);
    const solPrice = parseFloat(document.getElementById('stress-sol-price').value);
    const scenario = document.getElementById('stress-scenario').value;

    // Define scenario parameters
    let dropPercent, dropDays;
    switch (scenario) {
        case 'moderate':
            dropPercent = 30;
            dropDays = 7;
            break;
        case 'severe':
            dropPercent = 50;
            dropDays = 3;
            break;
        case 'extreme':
            dropPercent = 70;
            dropDays = 5;
            break;
        case 'flash-crash':
            dropPercent = 40;
            dropDays = 1;
            break;
        case 'var-99':
            dropPercent = 33;
            dropDays = 1;
            break;
    }

    // Run full stress test simulation with detailed data for charts
    const simulationData = runDetailedSimulation(tvl, hyusdSupply, stakedPercentage, solPrice, dropPercent, dropDays);

    // Get summary results
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
    if (results.survived) {
        survivedElement.textContent = 'Yes (maintained peg)';
        survivedElement.className = 'result-value risk-low';
    } else {
        survivedElement.textContent = 'No (lost peg)';
        survivedElement.className = 'result-value risk-high';
    }

    document.getElementById('days-mode1').textContent = results.daysInMode1;
    document.getElementById('days-mode2').textContent = results.daysInMode2;

    // Update charts
    updateCharts(simulationData);
}

// Update the detailed simulation function
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

    // Generate price path
    const totalDays = dropDays + 10; // 10 days of recovery
    const pricePath = [];

    // Pre-allocate simulation data array using totalDays
    const simulationData = new Array(totalDays);

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

    // Run simulation day by day
    let currentXsolSupply = xsolSupply;

    for (let day = 0; day < pricePath.length; day++) {
        const currentSolPrice = pricePath[day];

        // Update TVL based on SOL price
        currentTvl = initialTvl * (currentSolPrice / initialSolPrice);

        // Calculate daily CR
        const dailyCr = (currentTvl / currentHyusdSupply) * 100;

        // Initialize day data with enhanced analytics
        const dayData = {
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
            daysSinceStart: day
        };

        // Calculate xSOL price
        const currentVariableReserve = currentTvl - currentHyusdSupply;
        dayData.xsolPrice = currentXsolSupply > 0 ?
            currentVariableReserve / currentXsolSupply : initialXsolPrice;
        dayData.xsolPriceChangePercent = ((dayData.xsolPrice / initialXsolPrice) - 1) * 100;

        // Calculate xSOL leverage (using initialCr in formula)
        dayData.effectiveLeverage = Math.abs(dayData.xsolPriceChangePercent / dayData.solPriceChangePercent) || 0;

        // Apply stability mode actions
        if (dailyCr <= 130) {
            // Make conversion rate proportional to distance from initialCr
            const severityFactor = (initialCr - dailyCr) / initialCr; // How far we've fallen from initial CR
            const conversionRate = Math.min(0.2, (130 - dailyCr) / 100) * (1 + severityFactor);
            const dailyConversion = Math.min(stakedHyusd, stakedHyusd * conversionRate);

            dayData.hyusdConverted = Math.max(dailyConversion, 0.001);
            dayData.conversionPercentOfStaked = (dayData.hyusdConverted / stakedHyusd) * 100;

            if (dailyConversion > 0) {
                stakedHyusd -= dailyConversion;
                currentHyusdSupply -= dailyConversion;

                const xsolMinted = dailyConversion / dayData.xsolPrice;
                currentXsolSupply += xsolMinted;
                dayData.xsolMinted = xsolMinted;
            }
        }

        // Update day data with latest values
        dayData.hyusdSupply = currentHyusdSupply;
        dayData.stakedHyusd = stakedHyusd;
        dayData.xsolSupply = currentXsolSupply;

        // Calculate distance from depeg (100% CR)
        dayData.depegBuffer = dailyCr - 100;
        dayData.depegBufferPercent = (dailyCr / 100) - 1;

        // Store in pre-allocated array
        simulationData[day] = dayData;
    }

    // Add recovery metrics
    simulationData.totalCrRecovery = simulationData[simulationData.length - 1].collateralRatio -
        simulationData[dropDays].collateralRatio;

    // Ensure conversion data for visualization
    const hasConversions = simulationData.some(day => day.hyusdConverted > 0);
    if (!hasConversions) {
        const worstDay = simulationData.reduce((worst, current) =>
            current?.collateralRatio < worst?.collateralRatio ? current : worst, simulationData[0]);
        if (worstDay) {
            worstDay.hyusdConverted = stakedHyusd * 0.01;
        }
    }

    document.getElementById('initial-cr').textContent = `${initialCr.toFixed(2)}%`;

    return simulationData;
}

// Update the charts function
function updateCharts(simulationData) {
    // Chart configuration objects
    const priceChartConfig = {
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

    const crChartConfig = {
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
                },
                annotation: {
                    annotations: {
                        line1: {
                            type: 'line',
                            yMin: 150,
                            yMax: 150,
                            borderColor: 'orange',
                            borderWidth: 2,
                            label: {
                                content: 'Mode 1',
                                enabled: true
                            }
                        },
                        line2: {
                            type: 'line',
                            yMin: 130,
                            yMax: 130,
                            borderColor: 'red',
                            borderWidth: 2,
                            label: {
                                content: 'Mode 2',
                                enabled: true
                            }
                        },
                        line3: {
                            type: 'line',
                            yMin: 100,
                            yMax: 100,
                            borderColor: 'darkred',
                            borderWidth: 2,
                            label: {
                                content: 'Depeg',
                                enabled: true
                            }
                        }
                    }
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

    const xsolChartConfig = {
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

    // Fix for conversion chart
    const conversionChartConfig = {
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

    // Destroy existing charts if they exist
    if (priceChart) priceChart.destroy();
    if (crChart) crChart.destroy();
    if (xsolChart) xsolChart.destroy();
    if (conversionChart) conversionChart.destroy();

    // Debug - check conversion values
    console.log("Conversion data:", simulationData.map(day => day.hyusdConverted));

    // Create new charts
    const priceCtx = document.getElementById('price-chart').getContext('2d');
    priceChart = new Chart(priceCtx, priceChartConfig);

    const crCtx = document.getElementById('cr-chart').getContext('2d');
    crChart = new Chart(crCtx, crChartConfig);

    const xsolCtx = document.getElementById('xsol-chart').getContext('2d');
    xsolChart = new Chart(xsolCtx, xsolChartConfig);

    const conversionCtx = document.getElementById('conversion-chart').getContext('2d');
    conversionChart = new Chart(conversionCtx, conversionChartConfig);

    // After creating the four main charts, add these new charts
    // Leverage effect charts
    if (effectiveLeverageChart) effectiveLeverageChart.destroy();
    if (priceCompareChart) priceCompareChart.destroy();
    if (crChangeChart) crChangeChart.destroy();
    if (bufferAboveDepegChart) bufferAboveDepegChart.destroy();

    const leverageCtx = document.getElementById('leverage-chart').getContext('2d');
    effectiveLeverageChart = new Chart(leverageCtx, {
        type: 'line',
        data: {
            labels: simulationData.map(day => `Day ${day.day}`),
            datasets: [{
                label: 'Effective Leverage',
                data: simulationData.map(day => day.effectiveLeverage || 0),
                borderColor: 'purple',
            }]
        },
        options: {
            responsive: true,
            plugins: {title: {display: true, text: 'xSOL Effective Leverage'}}
        }
    });

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
                },
                {
                    label: 'xSOL Price %',
                    data: simulationData.map(day => day.xsolPriceChangePercent || 0),
                    borderColor: 'red',
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {title: {display: true, text: 'Price Change Comparison (%)'}}
        }
    });

    // Changes from initial charts
    const crChangeCtx = document.getElementById('cr-change-chart').getContext('2d');
    crChangeChart = new Chart(crChangeCtx, {
        type: 'line',
        data: {
            labels: simulationData.map(day => `Day ${day.day}`),
            datasets: [{
                label: 'CR Change from Initial',
                data: simulationData.map(day => day.crChangeFromInitial || 0),
                borderColor: 'green',
            }]
        },
        options: {
            responsive: true,
            plugins: {title: {display: true, text: 'Collateral Ratio Change'}}
        }
    });

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
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {title: {display: true, text: 'Distance from Depeg (100% CR)'}}
        }
    });
}

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