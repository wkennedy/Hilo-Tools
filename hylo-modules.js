// Import calculation module
import * as calc from './hylo-calculator.js';

// hylo-ui.js - Handles UI interactions and HTML updates
"use strict";

// ============================================================================
// VARIABLE DECLARATIONS
// ============================================================================

// Chart instances for all visualizations
let priceChart, crChart, xsolChart, conversionChart;
let effectiveLeverageChart, priceCompareChart, crChangeChart, bufferAboveDepegChart;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function () {
    console.log("DOM fully loaded, initializing app");
    initApp();
});

function initApp() {
    const appContent = document.getElementById('app-content');

    // Load header
    appendTemplate('header-template', appContent);

    // Load navigation
    appendTemplate('nav-template', appContent);

    // Load default calculator (APY)
    loadCalculator('apy');

    // Setup tab navigation
    setupTabNavigation();
}

// ============================================================================
// TEMPLATE LOADING & NAVIGATION
// ============================================================================

function appendTemplate(templateId, container) {
    const template = document.getElementById(templateId);
    if (template) {
        container.appendChild(template.content.cloneNode(true));
    } else {
        console.error(`Template ${templateId} not found`);
    }
}

function loadCalculator(calculatorType) {
    const appContent = document.getElementById('app-content');
    const contentContainers = document.querySelectorAll('.tab-content');

    // Remove previous calculators if they exist
    contentContainers.forEach(container => {
        container.remove();
    });

    console.log(`Loading calculator: ${calculatorType}`);

    // Load selected calculator
    switch (calculatorType) {
        case 'apy':
            appendTemplate('apy-calculator-template', appContent);
            // Use setTimeout to ensure DOM is updated before accessing elements
            setTimeout(() => {
                setupApyCalculator();
                calculateApy(); // Run initial calculation
            }, 0);
            break;
        case 'depeg':
            appendTemplate('depeg-calculator-template', appContent);
            setTimeout(() => {
                setupDepegCalculator();
                calculateDepegRisk(); // Run initial calculation
            }, 0);
            break;
        case 'stress':
            appendTemplate('stress-test-template', appContent);
            // Wait for the stress template to be added before adding child templates
            setTimeout(() => {
                const stressCalc = document.querySelector('#stress-calculator .calculator');
                if (stressCalc) {
                    appendTemplate('chart-tabs-template', stressCalc);
                    appendTemplate('main-charts-template', stressCalc);
                    appendTemplate('leverage-charts-template', stressCalc);
                    appendTemplate('changes-charts-template', stressCalc);
                    setupStressTest();
                    setupChartTabs();
                    runStressTest(); // Run initial calculation
                } else {
                    console.error('Stress calculator not found in DOM');
                }
            }, 0);
            break;
        default:
            console.error(`Calculator type ${calculatorType} not recognized`);
    }

    // Make sure the loaded content is active
    setTimeout(() => {
        const content = document.getElementById(`${calculatorType}-calculator`);
        if (content) {
            content.classList.add('active');
        }
    }, 0);
}

function setupTabNavigation() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function () {
            // Update tab UI
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            // Load the corresponding calculator
            const calculatorType = this.getAttribute('data-tab');
            loadCalculator(calculatorType);
        });
    });
}

function setupChartTabs() {
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            // Update chart tab UI
            document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            // Show the corresponding chart group
            const chartGroup = this.getAttribute('data-chart');
            document.querySelectorAll('.charts-grid').forEach(grid => {
                grid.style.display = 'none';
            });

            const selectedGrid = document.getElementById(`${chartGroup}-charts`);
            if (selectedGrid) {
                selectedGrid.style.display = 'grid';
            }
        });
    });
}

// ============================================================================
// CALCULATOR SETUP
// ============================================================================

function setupApyCalculator() {
    const calculateButton = document.getElementById('calculate-apy');
    if (calculateButton) {
        calculateButton.addEventListener('click', calculateApy);
    } else {
        console.error("Could not find element with ID 'calculate-apy'");
    }
}

function setupDepegCalculator() {
    const calculateDepegButton = document.getElementById('calculate-depeg');
    if (calculateDepegButton) {
        calculateDepegButton.addEventListener('click', calculateDepegRisk);
    } else {
        console.error("Could not find element with ID 'calculate-depeg'");
    }
}

function setupStressTest() {
    const runButton = document.getElementById('run-stress-test');
    if (runButton) {
        runButton.addEventListener('click', runStressTest);
    } else {
        console.error("Could not find element with ID 'run-stress-test'");
    }
}

// ============================================================================
// UI Event Handlers & Display Functions
// ============================================================================

/**
 * APY Calculator UI Handler
 */
function calculateApy() {
    console.log('APY calculation triggered');

    // Get input values
    const tvl = parseFloat(document.getElementById('tvl').value);
    const hyusdSupply = parseFloat(document.getElementById('hyusd-supply').value);
    const stakedPercentage = parseFloat(document.getElementById('staked-percentage').value);
    const baseYield = parseFloat(document.getElementById('base-yield').value);
    const yieldDistribution = parseFloat(document.getElementById('yield-distribution').value);

    // Call calculation function
    const results = calc.calculateApyResults(
        tvl, hyusdSupply, stakedPercentage, baseYield, yieldDistribution
    );

    // Update results in the UI
    document.getElementById('collateral-ratio').textContent = results.collateralRatio.toFixed(2) + '%';
    document.getElementById('current-apy').textContent = results.rawApy.toFixed(2) + '%';
    document.getElementById('yield-multiple').textContent = results.yieldMultiple.toFixed(2) + 'x';
    document.getElementById('risk-adjusted-apy').textContent = results.riskAdjustedApy.toFixed(2) + '%';
    document.getElementById('annual-yield').textContent = '$' + results.annualYield.toFixed(2);

    // Update staking levels table
    updateStakingLevelsTable(results.stakingLevels);
}

/**
 * Update staking levels table in the UI
 */
function updateStakingLevelsTable(stakingLevels) {
    const tbody = document.querySelector('#staking-levels-table tbody');
    if (!tbody) {
        console.error("Staking levels table not found");
        return;
    }

    tbody.innerHTML = '';

    stakingLevels.forEach(level => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${level.percentage}%</td>
            <td>${level.apy.toFixed(2)}%</td>
            <td class="${level.riskClass}">${level.riskLevel}</td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Depeg Risk Calculator UI Handler
 */
function calculateDepegRisk() {
    console.log('Depeg risk calculation triggered');

    // Get input values
    const tvl = parseFloat(document.getElementById('depeg-tvl').value);
    const hyusdSupply = parseFloat(document.getElementById('depeg-hyusd-supply').value);
    const stakedPercentage = parseFloat(document.getElementById('depeg-staked-percentage').value);
    const solPrice = parseFloat(document.getElementById('sol-price').value);
    const solPriceDrop = parseFloat(document.getElementById('sol-price-drop').value);

    // Call calculation function
    const results = calc.calculateDepegRiskResults(
        tvl, hyusdSupply, stakedPercentage, solPrice, solPriceDrop
    );

    // Update results in the UI
    document.getElementById('current-cr').textContent = results.currentCr.toFixed(2) + '%';
    document.getElementById('after-drop-cr').textContent = results.afterDropCr.toFixed(2) + '%';

    const stabilityModeElement = document.getElementById('stability-mode');
    if (stabilityModeElement) {
        stabilityModeElement.textContent = results.stabilityMode;
        stabilityModeElement.className = 'result-value ' + results.stabilityModeClass;
    }

    const hyusdConvertedElement = document.getElementById('hyusd-converted');
    if (hyusdConvertedElement) {
        hyusdConvertedElement.textContent =
            results.hyusdConverted.toLocaleString(undefined, {maximumFractionDigits: 0}) +
            ' (' + results.conversionPercentage.toFixed(2) + '%)';
    }

    const depegProbabilityElement = document.getElementById('depeg-probability');
    if (depegProbabilityElement) {
        depegProbabilityElement.textContent = results.depegLevel + ' (' + results.depegProbability + '%)';
        depegProbabilityElement.className = 'result-value ' + results.depegClass;
    }

    const maxSafeDropElement = document.getElementById('max-safe-drop');
    if (maxSafeDropElement) {
        maxSafeDropElement.textContent = results.maxSafeDrop.toFixed(2) + '%';
    }
}

/**
 * Stress Test UI Handler
 */
function runStressTest() {
    console.log('Stress test triggered');

    // Get input values
    const tvl = parseFloat(document.getElementById('stress-tvl').value);
    const hyusdSupply = parseFloat(document.getElementById('stress-hyusd-supply').value);
    const stakedPercentage = parseFloat(document.getElementById('stress-staked-percentage').value);
    const solPrice = parseFloat(document.getElementById('stress-sol-price').value);
    const scenarioSelect = document.getElementById('stress-scenario');

    if (!scenarioSelect) {
        console.error("Stress scenario selector not found");
        return;
    }

    const scenario = scenarioSelect.value;

    // Run simulation
    const simulationData = calc.runStressTest(
        tvl, hyusdSupply, stakedPercentage, solPrice, scenario
    );

    // Update UI with simulation results
    updateStressTestResults(simulationData);

    // Update charts
    updateCharts(simulationData);
}

/**
 * Update stress test results in the UI
 */
function updateStressTestResults(simResults) {
    // Helper function to safely update elements
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        } else {
            console.error(`Element with ID '${id}' not found`);
        }
    };

    // Update all result elements
    updateElement('initial-cr', `${simResults.initialCr.toFixed(2)}%`);
    updateElement('min-cr', simResults.minCr.toFixed(2) + '%');
    updateElement('min-cr-change', simResults.minCrChangePercent.toFixed(2) + '%');
    updateElement('final-cr', simResults.finalCr.toFixed(2) + '%');
    updateElement('final-cr-change', simResults.finalCrChangePercent.toFixed(2) + '%');

    updateElement('stress-hyusd-converted',
        simResults.totalHyusdConverted.toLocaleString(undefined, {maximumFractionDigits: 0}) +
        ' (' + simResults.conversionPercentage.toFixed(2) + '%)');

    updateElement('xsol-drawdown', simResults.xsolDrawdown.toFixed(2) + '%');
    updateElement('xsol-leverage', simResults.xsolLeverage.toFixed(2) + 'x');
    updateElement('depeg-buffer', simResults.depegBuffer.toFixed(2) + '% above depeg');
    updateElement('cr-recovery', '+' + simResults.crRecovery.toFixed(2) + '%');

    updateElement('days-mode1', simResults.daysInMode1);
    updateElement('days-mode2', simResults.daysInMode2);

    const survivedElement = document.getElementById('survived');
    if (survivedElement) {
        survivedElement.textContent = simResults.survived ? 'Yes (maintained peg)' : 'No (lost peg)';
        survivedElement.className = 'result-value ' + (simResults.survived ? 'risk-low' : 'risk-high');
    }
}

// ============================================================================
// CHART VISUALIZATION
// ============================================================================

/**
 * Update all charts with simulation data
 */
function updateCharts(simulationData) {
    if (typeof Chart === 'undefined') {
        console.error("Chart.js is not loaded");
        return;
    }

    // Create configuration objects for main charts
    const chartConfigs = {
        price: createPriceChartConfig(simulationData.dailyData),
        cr: createCRChartConfig(simulationData.dailyData),
        xsol: createXsolChartConfig(simulationData.dailyData),
        conversion: createConversionChartConfig(simulationData.dailyData)
    };

    // Create and update the main charts
    updateMainCharts(chartConfigs);

    // Create and update additional chart sets
    updateLeverageCharts(simulationData.dailyData);
    updateChangeCharts(simulationData.dailyData);
}

/**
 * Create price chart configuration
 */
function createPriceChartConfig(dailyData) {
    return {
        type: 'line',
        data: {
            labels: dailyData.map(day => `Day ${day.day}`),
            datasets: [{
                label: 'SOL Price (USD)',
                data: dailyData.map(day => day.solPrice),
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
function createCRChartConfig(dailyData) {
    return {
        type: 'line',
        data: {
            labels: dailyData.map(day => `Day ${day.day}`),
            datasets: [{
                label: 'Collateral Ratio (%)',
                data: dailyData.map(day => day.collateralRatio),
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
function createXsolChartConfig(dailyData) {
    return {
        type: 'line',
        data: {
            labels: dailyData.map(day => `Day ${day.day}`),
            datasets: [{
                label: 'xSOL Price (USD)',
                data: dailyData.map(day => day.xsolPrice),
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
function createConversionChartConfig(dailyData) {
    return {
        type: 'bar',
        data: {
            labels: dailyData.map(day => `Day ${day.day}`),
            datasets: [{
                label: 'hyUSD Converted',
                data: dailyData.map(day => day.hyusdConverted),
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
function updateMainCharts(chartConfigs) {
    // Function to safely get a chart context
    const getChartContext = (id) => {
        const canvas = document.getElementById(id);
        return canvas ? canvas.getContext('2d') : null;
    };

    // Destroy existing charts if they exist
    if (priceChart) priceChart.destroy();
    if (crChart) crChart.destroy();
    if (xsolChart) xsolChart.destroy();
    if (conversionChart) conversionChart.destroy();

    // Create new charts if contexts exist
    const priceCtx = getChartContext('price-chart');
    if (priceCtx) priceChart = new Chart(priceCtx, chartConfigs.price);

    const crCtx = getChartContext('cr-chart');
    if (crCtx) crChart = new Chart(crCtx, chartConfigs.cr);

    const xsolCtx = getChartContext('xsol-chart');
    if (xsolCtx) xsolChart = new Chart(xsolCtx, chartConfigs.xsol);

    const conversionCtx = getChartContext('conversion-chart');
    if (conversionCtx) conversionChart = new Chart(conversionCtx, chartConfigs.conversion);
}

/**
 * Update leverage effect charts
 */
function updateLeverageCharts(dailyData) {
    // Destroy existing charts if they exist
    if (effectiveLeverageChart) effectiveLeverageChart.destroy();
    if (priceCompareChart) priceCompareChart.destroy();

    // Function to safely get a chart context
    const getChartContext = (id) => {
        const canvas = document.getElementById(id);
        return canvas ? canvas.getContext('2d') : null;
    };

    // Create effective leverage chart
    const leverageCtx = getChartContext('leverage-chart');
    if (leverageCtx) {
        effectiveLeverageChart = new Chart(leverageCtx, {
            type: 'line',
            data: {
                labels: dailyData.map(day => `Day ${day.day}`),
                datasets: [{
                    label: 'Effective Leverage',
                    data: dailyData.map(day => day.effectiveLeverage || 0),
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
    }

    // Create price comparison chart
    const priceCompareCtx = getChartContext('price-compare-chart');
    if (priceCompareCtx) {
        priceCompareChart = new Chart(priceCompareCtx, {
            type: 'line',
            data: {
                labels: dailyData.map(day => `Day ${day.day}`),
                datasets: [
                    {
                        label: 'SOL Price %',
                        data: dailyData.map(day => day.solPriceChangePercent || 0),
                        borderColor: 'blue',
                        tension: 0.1
                    },
                    {
                        label: 'xSOL Price %',
                        data: dailyData.map(day => day.xsolPriceChangePercent || 0),
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
}

/**
 * Update collateral ratio change charts
 */
function updateChangeCharts(dailyData) {
    // Destroy existing charts if they exist
    if (crChangeChart) crChangeChart.destroy();
    if (bufferAboveDepegChart) bufferAboveDepegChart.destroy();

    // Function to safely get a chart context
    const getChartContext = (id) => {
        const canvas = document.getElementById(id);
        return canvas ? canvas.getContext('2d') : null;
    };

    // Create CR change chart
    const crChangeCtx = getChartContext('cr-change-chart');
    if (crChangeCtx) {
        crChangeChart = new Chart(crChangeCtx, {
            type: 'line',
            data: {
                labels: dailyData.map(day => `Day ${day.day}`),
                datasets: [{
                    label: 'CR Change from Initial',
                    data: dailyData.map(day => day.crChangeFromInitial || 0),
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
    }

    // Create depeg buffer chart
    const depegBufferCtx = getChartContext('depeg-buffer-chart');
    if (depegBufferCtx) {
        bufferAboveDepegChart = new Chart(depegBufferCtx, {
            type: 'line',
            data: {
                labels: dailyData.map(day => `Day ${day.day}`),
                datasets: [{
                    label: 'Buffer Above Depeg (%)',
                    data: dailyData.map(day => day.depegBuffer || 0),
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
}

// Initialize charts when not using simulator
function initCharts() {
    // Placeholder for chart initialization with dummy data
    const chartElements = document.querySelectorAll('canvas');
    chartElements.forEach(canvas => {
        if (canvas.getContext) {
            // Sample placeholder chart initialization
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#333';
            ctx.font = '14px Arial';
            ctx.fillText('Chart placeholder for ' + canvas.id, 20, 30);
        }
    });
}