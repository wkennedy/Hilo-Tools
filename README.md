# Hylo Protocol Calculators

A suite of interactive calculators to analyze and visualize the [Hylo](https://docs.hylo.so/introduction) Protocol's dual-token stablecoin system.

## Overview

These calculators help users understand and evaluate the Hylo Protocol, a DeFi stablecoin system built on Solana using Liquid Staking Tokens (LSTs) as collateral. The protocol features a dual-token system with hyUSD (stablecoin) and xSOL (leveraged token) sharing a common collateral pool.

## Features

### APY Calculator
- Calculate expected yield for hyUSD stakers
- View risk-adjusted returns based on collateral ratio
- Compare APY across different staking percentages

### Depeg Risk Calculator
- Evaluate stability of the hyUSD peg during market drawdowns
- Calculate collateral ratio after price drops
- Estimate stability pool conversion amounts
- Assess depeg probability in different scenarios

### Stress Test Simulator
- Simulate protocol behavior under various market stress scenarios
- Visualize SOL price movements, collateral ratio, and xSOL price impact
- Track stability pool drawdowns and protocol responses
- Analyze potential depeg scenarios

## Live Charts

The stress test includes four interactive charts powered by Chart.js:
- SOL Price Path: Shows price trajectory during the selected scenario
- Collateral Ratio: Displays CR changes with stability mode thresholds
- xSOL Price: Demonstrates the leveraged effect on xSOL
- Daily hyUSD Conversion: Visualizes when and how much hyUSD is converted to xSOL

## Installation

1. Clone this repository:
```
git clone https://github.com/yourusername/hylo-protocol-calculators.git
```

2. Open `index.html` in your web browser.

No server required - runs entirely in the browser.

## Protocol Mechanics

The calculators simulate key Hylo Protocol features including:

- Dual-token system (hyUSD & xSOL)
- Dynamic collateral ratio calculation
- Stability mode activation thresholds (150% and 130%)
- Stability pool draw down mechanism
- xSOL price and leverage calculations
- Risk-adjusted APY based on conversion probability

## Usage Example

To evaluate protocol stability during a market crash:

1. Select the "Stress Test" tab
2. Enter protocol parameters (TVL, hyUSD supply, staked percentage)
3. Select a stress scenario (e.g., "Severe - 50% drop over 3 days")
4. Click "Run Stress Test"
5. Review the metrics and charts to see how the protocol responds

## License

Apache 2 License - see LICENSE file for details.

## Disclaimer

These calculators provide simplified simulations based on the Hylo Protocol documentation. They are for educational purposes only and should not be used as financial advice. Real protocol behavior may differ based on market conditions and implementation details.