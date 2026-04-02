import random
from datetime import date, timedelta, datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from kiwisaver_insight.scheme_catalog import list_tracked_schemes

class SchemeData(BaseModel):
    id: str
    name: str
    provider: str
    type: str
    color: str

# Supported live schemes (matching the mobile app catalog)
AVAILABLE_SCHEMES = [
    SchemeData(
        id=scheme.id,
        name=scheme.display_name,
        provider=scheme.provider,
        type=scheme.risk_level,
        color=scheme.color,
    )
    for scheme in list_tracked_schemes()
]

def generate_unit_price_history(scheme_id: str, years: int) -> List[Dict[str, Any]]:
    scheme = next((s for s in AVAILABLE_SCHEMES if s.id == scheme_id), None)
    if not scheme:
        return []

    data_points = years * 12
    data = []
    
    base_returns = {
        'Conservative': 0.04,
        'Balanced': 0.06,
        'Growth': 0.08,
        'Aggressive': 0.095,
    }

    annual_return = base_returns.get(scheme.type, 0.06)
    monthly_return = annual_return / 12
    volatility = (
        0.04
        if scheme.type == 'Aggressive'
        else 0.03
        if scheme.type == 'Growth'
        else 0.02
        if scheme.type == 'Balanced'
        else 0.01
    )

    price = 1.0
    
    # Generate dates backwards from today
    end_date = date.today()
    
    # We generate forward from start date to ensure consistent graph shape
    # But for the API response, we want a list of points
    
    # Let's generate a consistent seed based on scheme_id to make charts stable across reloads if needed
    # random.seed(scheme_id) 

    prices = []
    current_price = 1.0
    
    for i in range(data_points + 1):
        # Calculate date
        # Approximate months by 30 days
        point_date = end_date - timedelta(days=(data_points - i) * 30)
        
        random_walk = (random.random() - 0.5) * volatility
        current_price = current_price * (1 + monthly_return + random_walk)
        
        # Convert date to datetime at midnight for timestamp
        dt = datetime.combine(point_date, datetime.min.time())
        timestamp = int(dt.timestamp() * 1000)

        prices.append({
            "date": point_date.strftime("%Y-%m-%d"),
            "timestamp": timestamp,
            "price": round(current_price, 4)
        })
        
    return prices

def calculate_outcome(price_history: List[Dict[str, Any]], initial_funds: float, monthly_contribution: float):
    if not price_history:
        return {"final_value": 0, "total_return": 0, "units": 0, "total_invested": 0}

    start_price = price_history[0]['price']
    end_price = price_history[-1]['price']

    total_units = initial_funds / start_price
    total_invested = initial_funds

    for i, point in enumerate(price_history):
        if i == 0:
            continue
        price = point['price']
        total_units += monthly_contribution / price
        total_invested += monthly_contribution

    final_value = total_units * end_price
    total_return = final_value - total_invested

    return {
        "final_value": round(final_value),
        "total_return": round(total_return),
        "units": round(total_units, 2),
        "total_invested": round(total_invested)
    }

# Strategy Simulation Logic

class SwitchCondition(BaseModel):
    id: str
    type: str # 'price_drop', 'price_rise', 'time_based', 'market_volatility', 'performance_threshold'
    label: str
    from_scheme: str # 'aggressive', 'balanced', 'conservative'
    to_scheme: str
    threshold: float
    threshold_unit: str

SCHEME_TYPES_CONFIG = {
    'aggressive': {'return_rate': 0.085, 'volatility': 0.15},
    'balanced': {'return_rate': 0.065, 'volatility': 0.10},
    'conservative': {'return_rate': 0.045, 'volatility': 0.05},
}

def simulate_strategy(conditions: List[SwitchCondition], initial_funds: float, monthly_contribution: float, years: int = 10):
    months = years * 12
    data = []
    switches = []
    
    current_scheme_type = 'balanced'
    balance = initial_funds
    total_invested = initial_funds
    
    end_date = date.today()

    for month in range(months + 1):
        point_date = end_date - timedelta(days=(months - month) * 30)
        
        config = SCHEME_TYPES_CONFIG.get(current_scheme_type, SCHEME_TYPES_CONFIG['balanced'])
        monthly_return = config['return_rate'] / 12
        volatility = config['volatility']
        
        random_factor = (random.random() - 0.5) * volatility
        month_return = monthly_return + random_factor
        
        balance = balance * (1 + month_return)
        
        if month > 0:
            balance += monthly_contribution
            total_invested += monthly_contribution
            
        # Check conditions
        for condition in conditions:
            if current_scheme_type != condition.from_scheme:
                continue
                
            should_switch = False
            
            if condition.type == 'price_drop':
                if month_return < -condition.threshold / 100:
                    should_switch = True
            elif condition.type == 'price_rise':
                if month_return > condition.threshold / 100:
                    should_switch = True
            elif condition.type == 'time_based':
                if month > 0 and month % (condition.threshold * 12) == 0:
                    should_switch = True
            elif condition.type == 'market_volatility':
                if abs(random_factor) > condition.threshold / 100:
                    should_switch = True
            elif condition.type == 'performance_threshold':
                performance_ratio = balance / total_invested if total_invested > 0 else 1
                if performance_ratio < condition.threshold:
                    should_switch = True
            
            if should_switch and current_scheme_type != condition.to_scheme:
                switches.append({
                    "month": month,
                    "from": condition.from_scheme,
                    "to": condition.to_scheme,
                    "reason": condition.label
                })
                current_scheme_type = condition.to_scheme
                break # Only one switch per month
        
        data.append({
            "date": point_date.strftime("%Y-%m-%d"),
            "month": month,
            "balance": round(balance),
            "invested": round(total_invested),
            "returns": round(balance - total_invested),
            "scheme": current_scheme_type
        })
        
    return {
        "data": data,
        "switches": switches,
        "final_balance": round(balance),
        "total_invested": round(total_invested)
    }
