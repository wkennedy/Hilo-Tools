# Hylo Protocol Calculators

A suite of interactive calculators to analyze and visualize the [Hylo](https://docs.hylo.so/introduction) Protocol's dual-token stablecoin system.

Click [here](https://wkennedy.github.io/HiLo-Tools/) to see it in action.

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

### Live Charts

The stress test includes four interactive charts powered by Chart.js:
- SOL Price Path: Shows price trajectory during the selected scenario
- Collateral Ratio: Displays CR changes with stability mode thresholds
- xSOL Price: Demonstrates the leveraged effect on xSOL
- Daily hyUSD Conversion: Visualizes when and how much hyUSD is converted to xSOL


### Other Notes

**NAV calculation of hyUSD and xSOL:**

The simulation uses the basic formula: hyUSD NAV in SOL = 1 / SOL Price
xSOL NAV is calculated from variable reserve: Variable Reserve = Total SOL in Reserve - (hyUSD NAV × hyUSD Supply)

**Collateral Ratio calculation:**

Applied as CR = (TVL / hyUSD Supply) × 100%
It is the same formula: Collateral Ratio = Total SOL In Reserve / (hyUSD NAV In SOL × hyUSD Supply)

**xSOL Effective Leverage:**

Calculated according to the definition of Effective Leverage = Total SOL In Reserve / Market Cap xSOL
The simulation illustrates this through leverage effect on xSOL price under market stress

**Stability pool yield:**

The APY calculator uses the underlying yield distribution formula
With TVL, staked percentage, and distribution ratio

**VaR analysis:**

The stress test covers scenarios generated from VaR analysis, including the 99.9% VaR of -33% for a one-day drop

**The calculators do not have:**

True LST value calculation via Sanctum (simplified as 1:1)
Multiple LST types with different yields
Minting/redeeming bounties
Recapitalization mechanisms
Market liquidity considerations

These aspects can be added in future updates to make the simulation more realistic.

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