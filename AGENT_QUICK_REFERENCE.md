# Quick Reference: Enhanced Agent Capabilities

## Target Metrics
- **Results**: 15-20 car suggestions per search
- **Iterations**: 2-4 typical, max 8
- **API Efficiency**: 1-2 SerpAPI calls per iteration
- **Uniqueness**: Make + Model + Year (allows different years of same model)

## Agent Behavior by Result Count

| Results | LLM Strategy | Example Query |
|---------|-------------|---------------|
| 0-4 | Cast WIDE net, multiple brands | "Honda Accord Toyota Camry Mazda6 Nissan Altima 2018 2019 2020" |
| 5-9 | Target DIFFERENT segments | "Honda CRV Toyota RAV4 Subaru Forester Mazda CX5 SUV" |
| 10-14 | Find VALUE picks, niche options | "Mazda CX5 Hyundai Tucson Kia Sportage Genesis GV70 2019 2020" |
| 15+ | END search (goal reached) | - |

## Boost Mechanism
**Triggers when**: Initial query returns < 5 results AND attempts < 7

**Budget-Based Boost Queries**:
- **$50k+**: "Acura RDX Infiniti QX50 Volvo XC60 luxury SUV 2018 2019 2020"
- **$35-50k**: "Mazda CX5 Subaru Outback VW Tiguan reliable SUV 2017 2018 2019"
- **$20-35k**: "Honda HRV Toyota CHR Mazda CX3 Kia Soul compact SUV 2016 2017 2018"
- **<$20k**: "Honda Fit Toyota Yaris Mazda2 Nissan Versa economical 2015 2016 2017"

**Result**: +5 suggestions from boost (up to 17 per iteration)

## Initial Query Generation

**Budget-Aware Model Targeting**:

| Budget | Models Searched | Year Range |
|--------|----------------|------------|
| $80k+ | BMW 5 Series, Audi A6, Mercedes E-Class, Lexus ES, Tesla Model 3, Genesis G80 | 2021-2024 (3 years) |
| $50-80k | Acura TLX, Infiniti Q50, Cadillac CT5, Genesis G70, Volvo S60, Audi A4 | 2019-2024 (5 years) |
| $35-50k | Honda Accord, Toyota Camry, Mazda6, Subaru Legacy, VW Passat, Nissan Altima | 2017-2024 (7 years) |
| $20-35k | Honda Civic, Toyota Corolla, Mazda3, Hyundai Elantra, Kia Forte, Subaru Impreza | 2014-2024 (10 years) |
| <$20k | Honda Civic, Toyota Corolla, Mazda3, Ford Focus, Hyundai Accent | 2009-2024 (15 years) |

## Per-Iteration Aggregation

**Maximum possible per iteration**:
- Main search: 12 suggestions
- Boost search (if triggered): +5 suggestions
- **Total**: Up to 17 new cars per iteration

**Typical flow**:
1. Iteration 1: 10-12 results
2. Iteration 2: +6-8 results (18 total) → DONE ✓

## Code Locations

### Main Components
- **LLM Decision**: `llm_decision_node()` - Lines ~20-165
- **Search Execution**: `search_node()` - Lines ~165-270
- **Boost Logic**: `search_node()` boost section - Lines ~235-265
- **Entry Point**: `get_car_suggestions()` - Lines ~270-480

### Key Parameters
```python
MAX_ATTEMPTS = 8           # Line ~35
TARGET_RESULTS = 15        # Line ~42
SERPAPI_NUM = 20          # Line ~186
RESULTS_PER_SEARCH = 12   # Line ~268
BOOST_RESULTS = 5         # Line ~263
```

## Testing Checklist

- [ ] Budget $15k → Should find economical 2010-2018 cars
- [ ] Budget $30k → Should find mid-range 2015-2020 cars
- [ ] Budget $60k → Should find premium 2019-2024 cars
- [ ] Verify 15+ suggestions returned
- [ ] Verify diverse makes (Honda, Toyota, Mazda, etc.)
- [ ] Verify different years of same model appear as unique options
- [ ] Check LLM reasoning in response
- [ ] Confirm backend completeness filter works
- [ ] Verify price filtering keeps results in budget range

## Monitoring

**Look for these log messages**:
- ✅ "Found enough suggestions for swipe experience" (15+ reached)
- ⚠️ "Boosting search - only found X results" (boost triggered)
- 📊 "After deduplication: X unique make/model/year combinations"
- 🤖 "LLM Reasoning: ..." (agent's search strategy)

## Fallback Behavior

If LLM fails, rule-based logic kicks in:
1. **0 results**: "best reliable cars 2015-2020 under $X"
2. **<5 results**: "Honda Civic Toyota Corolla Mazda3 Hyundai Elantra 2016-2019"
3. **<10 results**: "Honda CRV Toyota RAV4 Mazda CX5 Subaru Forester 2016-2019"
4. **10+ results**: "Kia Sportage Hyundai Tucson Nissan Rogue value 2017-2019"

---

**Quick Start**: Just call `/api/search/suggestions` with `budget` and optional `features`/`bodyTypes`. Agent handles the rest!
